/**
 * TONAIAgent Core
 *
 * AI-native Global Financial Infrastructure (AGFI) — global capital coordination at
 * institutional scale, comparable to SWIFT, IMF, and BIS but with AI-coordination,
 * on-chain transparency, programmability, and borderless design. Includes multi-provider
 * AI layer with production-grade security, plugin system, strategy engine, no-code strategy
 * builder, marketplace, copy trading, institutional compliance, omnichain infrastructure,
 * agent launchpad, autonomous hedge fund infrastructure, viral consumer growth engine,
 * AI safety/alignment framework, ecosystem fund, TON Super App (wallet, AI agents, social
 * layer, Telegram Mini App), Telegram-native mobile-first UX, AI-native personal finance,
 * Open Agent Protocol, Enterprise SDK & Developer Platform, token strategy (launch, liquidity
 * flywheel, valuation, simulation), AI-native payments and commerce layer, global regulatory
 * strategy framework, and global institutional network for autonomous finance on TON blockchain.
 *
 * Features:
 * - Multi-provider AI support (Groq, Anthropic, OpenAI, Google, xAI, OpenRouter)
 * - Production-grade security and key management
 * - Multiple custody models (Non-Custodial, Smart Contract Wallet, MPC)
 * - Multi-layer transaction authorization
 * - Risk and fraud detection
 * - Emergency controls and recovery mechanisms
 * - Comprehensive audit logging
 * - Multi-agent coordination framework
 * - Modular plugin and tooling system
 * - TON-native tools (wallet, jettons, NFT)
 * - AI function calling integration
 * - Autonomous Strategy Engine for DeFi automation
 * - No-code visual strategy builder
 * - AI-assisted strategy creation
 * - Historical backtesting and simulation
 * - Strategy marketplace and copy trading
 * - Reputation and scoring system
 * - Performance analytics and monetization
 * - Tokenomics and agent economy (staking, governance, rewards, reputation)
 * - Institutional compliance (KYC/AML, regulatory reporting)
 * - Portfolio risk management (VaR, stress testing)
 * - AI governance and explainability
 * - Omnichain infrastructure (cross-chain capital movement, arbitrage, yield rotation)
 * - ChangeNOW integration (200+ chains, 1200+ assets)
 * - Cross-chain portfolio management and risk assessment
 * - Agent Launchpad for DAOs, funds, and autonomous treasuries
 * - Autonomous Hedge Fund Architecture (portfolio, execution, risk agents)
 * - AI-driven investment framework (signals, predictions, RL)
 * - Institutional portfolio engine (diversification, rebalancing)
 * - Continuous learning system (backtesting, live adaptation)
 * - Global data and signal platform for AI agents
 * - Viral consumer growth engine (referrals, social trading, gamification)
 * - Growth analytics and A/B testing
 * - Anti-abuse and sybil detection
 * - AI Safety, Alignment & Governance Framework
 * - Ecosystem fund (treasury, grants, investments, incubation, incentives)
 * - Super App: Smart Wallet with MPC recovery
 * - Super App: Agent Dashboard for monitoring and automation
 * - Super App: Social Layer with profiles, leaderboards, discussions
 * - Super App: Financial Dashboard with portfolio, risk, analytics
 * - Super App: Notifications and real-time alerts
 * - Super App: Telegram Mini App integration
 * - Super App: Gamification and growth mechanisms
 * - Super App: Embedded AI Assistant powered by Groq
 * - Super App: Premium subscriptions and monetization
 * - Telegram-native mobile-first UX with conversational AI
 * - AI-native personal finance (savings automation, wealth management)
 * - Life-stage personalization and behavioral finance
 * - Financial education with gamification
 * - Open Agent Protocol (OAP) for autonomous agent interoperability
 * - Enterprise SDK & Developer Platform
 * - Token strategy (launch, liquidity flywheel, valuation, simulation)
 * - AI-native payments and commerce layer (autonomous payments, subscriptions)
 * - Smart spending with AI optimization
 * - Merchant infrastructure (SDK, checkout, webhooks)
 * - Agent-driven commerce (negotiations, procurement, B2B)
 * - Cross-border payments with route optimization
 * - Payment analytics and fraud detection
 * - Global regulatory strategy and jurisdictional framework
 * - Tiered KYC/AML compliance for retail, professional, and institutional clients
 * - EU AI Act alignment with AI governance and system classification
 * - Cross-border compliance architecture
 * - Regulatory risk monitoring and SAR detection
 * - Global institutional network (partner registry, custody, liquidity, treasury)
 * - Institutional onboarding framework with due diligence
 * - DAO Governance & Treasury Layer (proposals, voting, delegation, AI treasury, multi-sig)
 * - Global expansion strategy and roadmap
 * - AI-powered institutional advantage (risk modeling, anomaly detection)
 * - Institutional governance (advisory boards, committees, policies)
 * - Cross-Chain Liquidity Integration Layer (multi-chain connector framework, liquidity
 *   aggregation, cross-chain trade execution, multi-chain portfolio tracking, risk controls,
 *   agent plugin system integration for arbitrage, analytics, and liquidity scanning)
 */

export * from './ai';

// Re-export ai-safety with namespace to avoid conflicts with AI types
// (both modules define types like FraudPattern, PolicyCondition, RiskContext, etc.)
export * as AISafety from './ai-safety';
export * from './security';
export * from './tokenomics';

// Re-export plugins with namespace to avoid naming conflicts with AI types
export * as Plugins from './plugins';

// Re-export strategy with namespace to avoid naming conflicts with multi-agent and tokenomics types
// (multiple modules define types like CapitalAllocation, ActionResult, and StrategyPerformance)
export * as Strategy from './strategy';

// Re-export multi-agent with namespace to avoid naming conflicts with tokenomics types
// (both modules define GovernanceConfig, DelegationRequest, CapitalPool, GovernanceStats)
export * as MultiAgent from './multi-agent';

// No-code module is available as separate import: '@tonaiagent/core/no-code'

// Autonomous Strategy Discovery Engine — available as separate import:
// '@tonaiagent/core/autonomous-discovery'
export * as AutonomousDiscovery from './autonomous-discovery';

// Cross-Chain Liquidity Integration Layer — available as separate import:
// '@tonaiagent/core/cross-chain-liquidity'
export * as CrossChainLiquidity from './cross-chain-liquidity';

// Marketplace exports (with explicit exports to avoid conflicts)
export {
  // Marketplace service
  createMarketplaceService,
  DefaultMarketplaceService,
  // Strategy
  createStrategyManager,
  DefaultStrategyManager,
  // Copy trading
  createCopyTradingEngine,
  DefaultCopyTradingEngine,
  // Reputation
  createReputationManager,
  DefaultReputationManager,
  // Analytics
  createAnalyticsEngine,
  DefaultAnalyticsEngine,
  // Monetization
  createMonetizationManager,
  DefaultMonetizationManager,
  // Risk transparency
  createRiskTransparencyManager,
  DefaultRiskTransparencyManager,
} from './marketplace';

// Re-export marketplace types with namespace to avoid conflicts
export type * as MarketplaceTypes from './marketplace/types';

// Strategy Marketplace v1 — unified module namespace
// Exposes: Strategy Registry, Marketplace API, and all v1 marketplace components
export * as StrategyMarketplaceModule from './marketplace';
export {
  // Strategy Registry
  createStrategyRegistry,
  DefaultStrategyRegistry,
  // Marketplace API
  createMarketplaceAPI,
  DefaultMarketplaceAPI,
} from './marketplace';

// Re-export omnichain with namespace to avoid naming conflicts
// (omnichain defines its own ActionResult, ChainId, and other common types)
export * as Omnichain from './omnichain';

// Note: Import institutional module separately from '@tonaiagent/core/institutional'
// to avoid naming conflicts with existing exports

// Note: Import omnichain module separately from '@tonaiagent/core/omnichain'
// for full access to all omnichain types and interfaces

// Re-export launchpad with namespace to avoid naming conflicts
// (launchpad has its own GovernanceConfig, CapitalPool, and similar types)
export * as Launchpad from './launchpad';

// Re-export hedgefund with namespace to avoid naming conflicts
// (hedgefund module defines StrategyAllocation, PortfolioPerformance, etc.)
export * as HedgeFund from './hedgefund';

// Note: Import hedgefund module separately from '@tonaiagent/core/hedgefund'
// for direct access to hedge fund types and managers

// Re-export data-platform with namespace to avoid naming conflicts
// (data-platform defines MarketDataService which could conflict with other modules)
export * as DataPlatform from './data-platform';

// Growth Engine exports (referral, social trading, gamification, viral loops, analytics, anti-abuse)
export {
  // Main engine
  createGrowthEngine,
  DefaultGrowthEngine,
  // Referral system
  createReferralSystem,
  DefaultReferralSystem,
  // Social trading
  createSocialTradingEngine,
  DefaultSocialTradingEngine,
  // Gamification
  createGamificationEngine,
  DefaultGamificationEngine,
  // Viral loops
  createViralLoopsEngine,
  DefaultViralLoopsEngine,
  // Growth analytics
  createGrowthAnalyticsEngine,
  DefaultGrowthAnalyticsEngine,
  // Anti-abuse
  createAntiAbuseSystem,
  DefaultAntiAbuseSystem,
} from './growth';

// Re-export growth types with namespace to avoid conflicts
export type * as GrowthTypes from './growth/types';

// Note: Import ecosystem fund module separately from '@tonaiagent/core/ecosystem-fund'
// to avoid naming conflicts with existing exports (governance, treasury, etc.)

// Note: Import superapp module separately from '@tonaiagent/core/superapp'
// to access the full Super App functionality (wallet, agents, social, financial, etc.)

// Note: Import mobile-ux module separately from '@tonaiagent/core/mobile-ux'
// for Telegram-native mobile-first UX features

// Note: Import personal-finance module separately from '@tonaiagent/core/personal-finance'
// for AI-native personal finance features (savings, investments, education, dashboard)

// Open Agent Protocol - Universal standard for autonomous agents
// Provides identity, capabilities, messaging, security, reputation, plugins, cross-chain, and governance
export * as Protocol from './protocol';
export {
  // Main protocol class
  OpenAgentProtocol,
  createAgent,
  // Types
  type OpenAgentProtocolConfig,
  type CreateAgentInput,
  type ProtocolAgent,
  type ProtocolEventHandler,
} from './protocol';

// Note: Import protocol module separately from '@tonaiagent/core/protocol'
// for full access to all protocol features (identity, capabilities, messaging, etc.)

// Note: Import SDK module separately from '@tonaiagent/core/sdk'
// for Enterprise SDK & Developer Platform (agent management, extensions, sandbox)

// Note: Import token-strategy module separately from '@tonaiagent/core/token-strategy'
// for strategic token launch, liquidity flywheel, valuation modeling, and simulation

// Note: Import payments module separately from '@tonaiagent/core/payments'
// for AI-native payments and commerce features (gateway, subscriptions, merchants, agents)

// Global Regulatory Strategy & Jurisdictional Framework
// Provides comprehensive compliance infrastructure for AI-native autonomous finance
export * as Regulatory from './regulatory';
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
  type RiskLevel,
  type AiSystemClassification,
} from './regulatory';

// Note: Import regulatory module separately from '@tonaiagent/core/regulatory'
// for full access to all regulatory features (jurisdiction analysis, KYC/AML, AI governance, risk engine)

// Note: Import institutional-network module separately from '@tonaiagent/core/institutional-network'
// for global institutional network features (partner registry, custody infrastructure, liquidity network,
// treasury interoperability, institutional onboarding, reporting, global expansion, AI advantage, governance)

// Note: Import ai-credit module separately from '@tonaiagent/core/ai-credit'
// for AI-native credit, lending, and underwriting features (CoinRabbit integration,
// credit scoring, collateral management, underwriting engine, lending strategies)

// TON Smart Contract Factory
// TON-native factory system for deploying Agent Wallet Contracts and Strategy Contracts
// with deterministic address generation, version control, and upgrade patterns.
// Note: Import ton-factory module separately from '@tonaiagent/core/ton-factory'
// for full access (factory contract, agent wallets, strategy executor, registry, fee manager)
export * as TonFactory from './ton-factory';
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
  NonCustodialProvider,
  MPCProvider,
  SmartContractWalletProvider,
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
} from './ton-factory';

// Investor-Ready End-to-End Demo Flow (Issue #90)
// Orchestrates all 7 demo steps: Landing, Agent Creation, Telegram Integration,
// TON Wallet Creation, Strategy Activation, Live Dashboard, Social & Viral.
// Note: Import separately from '@tonaiagent/core/investor-demo' for full access.
export * as InvestorDemo from './investor-demo';
export {
  InvestorDemoManager,
  createInvestorDemoManager,
  defaultInvestorDemoConfig,
  type InvestorDemoConfig,
  type DemoSession,
  type DemoStep,
  type DemoStepId,
  type DemoSummary,
  type InvestorDemoService,
  type InvestorDemoEvent,
  type InvestorDemoEventCallback,
} from './investor-demo';

// One-Click Agent Creation Orchestrator (Issue #91)
// Single orchestration layer that transforms the platform from a collection of
// modules into a cohesive product. One call provisions runtime, wallet,
// Telegram bot, strategy, persistence, and security.
// Note: Import separately from '@tonaiagent/core/agent-orchestrator' for full access.
// Note: Namespace is exported as AgentOrchestratorModule to avoid conflict with the AgentOrchestrator class.
export * as AgentOrchestratorModule from './agent-orchestrator';
export {
  // Orchestrator
  AgentOrchestrator,
  createAgentOrchestrator,
  DEFAULT_ORCHESTRATOR_CONFIG,
  // API
  AgentOrchestratorApi,
  createAgentOrchestratorApi,
  // Error
  AgentOrchestratorError,
  // Types
  // Note: CreateAgentInput from agent-orchestrator is exported as OrchestratorCreateAgentInput
  // to avoid conflict with CreateAgentInput from ./protocol (Open Agent Protocol)
  type CreateAgentInput as OrchestratorCreateAgentInput,
  type CreateAgentResult,
  type AgentMetadata,
  type AgentStatus,
  type AgentStrategy,
  type AgentEnvironment,
  type AgentProvisioningSummary,
  type SubsystemResult,
  type AgentOrchestratorConfig,
  type OrchestratorHealth,
  type OrchestratorMetrics,
  type OrchestratorEvent,
  type OrchestratorEventType,
  type OrchestratorEventHandler,
  type OrchestratorUnsubscribe,
  type OrchestratorApiRequest,
  type OrchestratorApiResponse,
  type AgentOrchestratorErrorCode,
} from './agent-orchestrator';

// Agent Lifecycle Cloud Orchestrator (Issue #92)
// Cloud-native orchestration layer that manages the full lifecycle of autonomous
// agents at scale. Provides the core control plane of the TON AI platform with
// lifecycle state machine (Created/Active/Running/Paused/Suspended/Terminated),
// distributed scheduler (cron, event, market, on-chain triggers), runtime allocator,
// health monitor with anomaly detection, scaling engine, alerting engine with
// auto-shutdown, admin control interface with governance, audit trails, and
// migration support for cloud provider/runtime/wallet/multi-chain migrations.
// Note: Import separately from '@tonaiagent/core/lifecycle-orchestrator' for full access.
export * as LifecycleOrchestratorModule from './lifecycle-orchestrator';
export {
  // Orchestrator
  LifecycleOrchestrator,
  createLifecycleOrchestrator,
  DEFAULT_LIFECYCLE_CONFIG,
  // API
  LifecycleOrchestratorApi,
  createLifecycleOrchestratorApi,
  // Error
  LifecycleOrchestratorError,
  // State machine
  LIFECYCLE_TRANSITIONS,
  // Types
  type LifecycleState,
  type StateTransition,
  type ScheduleConfig,
  type ScheduledJob,
  type RuntimeAllocation,
  type ResourceTier,
  type ComputeEnvironment,
  type CloudProvider,
  type HealthCheckResult,
  type HealthStatus,
  type AgentPerformanceMetrics,
  type AnomalyReport,
  type ScalingPolicy,
  type Alert,
  type AlertSeverity,
  type AlertChannel,
  type GovernancePermission,
  type PermissionScope,
  type AuditEntry,
  type MigrationRecord,
  type MigrationType,
  type AgentLifecycleRecord,
  type TerminationReport,
  type RegisterAgentInput,
  type RegisterAgentResult,
  type TransitionStateInput,
  type ScheduleJobInput,
  type ScaleAgentInput,
  type LifecycleOrchestratorConfig,
  type LifecycleOrchestratorHealth,
  type LifecycleOrchestratorMetrics,
  type LifecycleEvent,
  type LifecycleEventType,
  type LifecycleEventHandler,
  type LifecycleUnsubscribe,
  type LifecycleApiRequest,
  type LifecycleApiResponse,
  type LifecycleOrchestratorErrorCode,
} from './lifecycle-orchestrator';

// Secure Multi-Tenant Agent Infrastructure & Isolation Layer (Issue #99)
// Enterprise-grade tenant isolation with RBAC, sandbox runtime, secret vault,
// and per-agent wallet isolation for thousands of concurrent tenants.
// Note: Import separately from '@tonaiagent/core/multi-tenant' for full access.
export * as MultiTenantModule from './multi-tenant';
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
} from './multi-tenant';

// Distributed Scheduler & Event Engine (Issue #93)
// Fault-tolerant distributed cron engine with event-driven execution,
// on-chain TON blockchain event listeners, worker pool, and retry/DLQ engine.
// Architecture: EventBus → Scheduler → TaskQueue → WorkerPool → RetryEngine → DeadLetterQueue
// Note: Import separately from '@tonaiagent/core/distributed-scheduler' for full access.
export * as DistributedSchedulerModule from './distributed-scheduler';
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
} from './distributed-scheduler';

// Global Infrastructure & Edge Deployment (Issue #100)
// Production-grade global infrastructure with edge runtime, geo-distributed orchestration,
// compliance-aware regional deployment, global scheduler, cost optimization, and edge intelligence.
// Architecture: EdgeNodeRegistry → GeoRouter → ComplianceEngine → GlobalScheduler →
//               CostOptimizer → GlobalMonitor → EdgeIntelligenceLayer
// Note: Import separately from '@tonaiagent/core/global-infrastructure' for full access.
export * as GlobalInfrastructureModule from './global-infrastructure';
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
} from './global-infrastructure';

// Autonomous AI Investment Layer (Issue #102)
// Programmable, AI-native financial layer on TON for managing capital through
// investment vaults, risk management, dynamic allocation, portfolio optimization,
// and institutional compliance with full audit trails.
// Architecture: User/Institution → Investment Vault → Capital Allocation Engine
//               → AI Strategy Agents → TON Smart Contracts
// Note: Import separately from '@tonaiagent/core/investment' for full access.
export * as InvestmentLayerModule from './investment';
export {
  // Unified layer
  DefaultInvestmentLayer,
  createInvestmentLayer,
  DEFAULT_INVESTMENT_LAYER_CONFIG,
  // Vault manager
  DefaultVaultManager,
  createVaultManager,
  // Risk engine
  DefaultRiskEngine,
  createRiskEngine,
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
  type RiskEngine,
  type AgentRiskProfile,
  // Note: exported as InvestmentRiskLevel to avoid conflict with regulatory module's RiskLevel
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
} from './investment';

// AI Prime Brokerage (Issue #108)
// Institutional-grade prime brokerage infrastructure for autonomous AI funds and agents on TON.
// Provides multi-fund custody & clearing, margin & leverage engine, risk aggregation,
// capital efficiency, institutional reporting, securities lending, and cross-chain prime brokerage.
// Architecture: Investors → Tokenized Fund → Prime Brokerage Layer → AI Risk Engine → Agent Strategies → Execution
// Note: Import separately from '@tonaiagent/core/prime-brokerage' for full access.
export * as PrimeBrokerage from './prime-brokerage';

// AI-native Clearing House (Issue #120)
// Institutional-grade clearing and settlement infrastructure for autonomous AI funds and agents on TON.
// Provides central clearing smart contract layer, AI risk netting engine, collateral management,
// default resolution framework, real-time settlement, and clearing audit & transparency.
// Architecture: Agents / Funds → Prime Brokerage → Liquidity Network → Clearing House → Settlement Finality
// Note: Import separately from '@tonaiagent/core/clearing-house' for full access.
export * as ClearingHouse from './clearing-house';
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
} from './clearing-house';
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
} from './prime-brokerage';

// Institutional Liquidity Network (Issue #119)
// Deep liquidity infrastructure layer for institutional capital routing on TON.
// Enables aggregated liquidity pools, cross-fund capital routing, smart order routing,
// deep liquidity sourcing, and risk-controlled execution built on The Open Network.
// Architecture: Agents/Funds → Prime Brokerage → Liquidity Network → DEX / OTC / Cross-chain
// Note: Import separately from '@tonaiagent/core/liquidity-network' for full access.
export * as LiquidityNetwork from './liquidity-network';
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
} from './liquidity-network';

// DAO Governance & Treasury Layer (Issue #103)
// Self-governing AI financial protocol with on-chain treasury management,
// multi-tier voting, AI-driven capital allocation within governance constraints,
// and institutional-grade governance comparable to MakerDAO/Aave.
// Architecture: Token Holders → Governance Layer → Treasury Policies
//               → AI Treasury Manager → AI Investment Agents → Execution Layer
// Note: Import separately from '@tonaiagent/core/dao-governance' for full access.
export * as DaoGovernanceModule from './dao-governance';
export {
  // Unified layer
  DefaultDaoGovernanceLayer,
  createDaoGovernanceLayer,
  DEFAULT_DAO_GOVERNANCE_CONFIG,
  // Governance engine
  DefaultGovernanceEngine,
  createGovernanceEngine,
  // Treasury vault
  DefaultTreasuryVaultManager,
  createTreasuryVaultManager,
  // Risk governance
  DefaultRiskGovernanceManager,
  createRiskGovernanceManager,
  // AI treasury
  DefaultAiTreasuryManager,
  createAiTreasuryManager,
  // Multi-sig
  DefaultMultiSigManager,
  createMultiSigManager,
  // Marketplace governance
  DefaultMarketplaceGovernanceManager,
  createMarketplaceGovernanceManager,
  // Delegated governance
  DefaultDelegatedGovernanceManager,
  createDelegatedGovernanceManager,
  // Types
  type DaoGovernanceLayerService,
  type DaoGovernanceConfig,
  type DaoGovernanceHealth,
  type GovernanceEngine,
  type GovernanceEngineConfig,
  type DaoProposal,
  type DaoProposalType,
  type DaoProposalStatus,
  type CreateDaoProposalInput,
  type DaoVote,
  type DaoVoteType,
  type DaoVoteResult,
  type VotingDelegation,
  type VotingPowerSnapshot,
  type CreateDelegationInput,
  type TreasuryVaultManager,
  type TreasuryVaultConfig,
  type TreasuryVault,
  type TreasuryAsset,
  type TreasuryAssetType,
  type TreasuryAllocation,
  type TreasuryAllocationRequest,
  type TreasuryTransaction,
  type TreasuryReport,
  type TreasuryRiskParameters,
  type TreasuryRiskAssessment,
  type CircuitBreakerState,
  type EmergencyAction,
  type RiskGovernanceManager,
  type RiskGovernanceConfig,
  type RiskCheckReport,
  // Note: exported as DaoRiskViolation to avoid conflict with investment module's RiskViolation
  type RiskViolation as DaoRiskViolation,
  type AiTreasuryManager,
  type AiTreasuryConfig,
  type AiRebalanceRecommendation,
  type TreasuryRebalanceAction,
  type YieldOptimizationResult,
  type EmergencyExitPlan,
  type MultiSigManager,
  type MultiSigManagerConfig,
  type MultiSigConfig,
  type MultiSigOperation,
  type MultiSigSignature,
  type MarketplaceGovernanceManager,
  type MarketplaceGovernanceStats,
  type GovernedStrategyListing,
  type StrategyVote,
  type DelegatedGovernanceManager,
  type DelegatedGovernanceStats,
  type InstitutionalDelegate,
  type DelegateVotingRecord,
  type DaoEvent,
  type DaoEventType,
  type DaoEventCallback,
} from './dao-governance';

// Systemic Risk & Stability Framework (Issue #122)
// System-wide risk containment and stability controls analogous to BIS/Federal Reserve
// but fully transparent, algorithmic, AI-supervised, and on-chain enforceable.
// Components: Global Exposure Monitor, Dynamic Leverage Governor, Circuit Breaker,
//             Insurance & Stability Fund, AI Stress Testing Engine, GAAMP Stability Index.
// Architecture: Agents/Funds → Prime Brokerage → Clearing House
//               → Systemic Risk Engine → Leverage Governor → Stability Fund
// Note: Import separately from '@tonaiagent/core/systemic-risk' for full access.
export * as SystemicRisk from './systemic-risk';
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
} from './systemic-risk';

// Inter-Protocol Liquidity Standard (Issue #124)
// Standardized framework for cross-protocol liquidity routing, risk-aware capital
// allocation, shared clearing logic, and institutional interoperability.
// Enables any IPLS-compliant protocol to act as a LiquidityProvider or
// LiquidityConsumer with full on-chain trust guarantees.
// Architecture: GAAMP → Liquidity Network → IPLS Layer → External Protocols → Cross-chain Liquidity
// Note: Import separately from '@tonaiagent/core/ipls' for full access.
export * as IPLSModule from './ipls';
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
} from './ipls';

// Autonomous Capital Markets Stack (ACMS) — Issue #125
// Vertically integrated, AI-native capital markets infrastructure on TON.
// Unifies 9 protocol layers: Asset → Agent/Fund → Liquidity → Prime Brokerage →
// Clearing/Settlement → Risk/Stability → Monetary/Treasury → Inter-Protocol → Governance
// Replaces BlackRock, Goldman Sachs, NASDAQ, DTCC, Federal Reserve with AI-coordinated stack.
// Note: Import separately from '@tonaiagent/core/acms' for full access to all 9 layers.
export * as ACMS from './acms';
export {
  // Unified manager
  DefaultACMSManager,
  createACMSManager,
  DEFAULT_ACMS_CONFIG,
  // Layer 1: Asset Layer
  DefaultAssetLayerManager,
  createAssetLayerManager,
  // Layer 2: Agent & Fund Layer
  DefaultAgentFundLayerManager,
  createAgentFundLayerManager,
  // Layer 3: Liquidity Layer
  DefaultLiquidityLayerManager,
  createLiquidityLayerManager,
  // Layer 4: Prime Brokerage Layer (ACMS)
  DefaultPrimeBrokerageLayerManager,
  createPrimeBrokerageLayerManager,
  // Layer 5: Clearing & Settlement Layer
  DefaultClearingSettlementLayerManager,
  createClearingSettlementLayerManager,
  // Layer 6: Risk & Stability Layer
  DefaultRiskStabilityLayerManager,
  createRiskStabilityLayerManager,
  // Layer 7: Monetary & Treasury Layer
  DefaultMonetaryTreasuryLayerManager,
  createMonetaryTreasuryLayerManager,
  // Layer 8: Inter-Protocol Layer
  DefaultInterProtocolLayerManager,
  createInterProtocolLayerManager,
  // Layer 9: Governance Layer (ACMS)
  DefaultGovernanceLayerManager,
  createGovernanceLayerManager,
  // Types
  type ACMSManager,
  type ACMSConfig,
  type ACMSStackStatus,
  type ACMSEvent,
  type ACMSEventCallback,
} from './acms';

// AI-native Global Financial Infrastructure (AGFI)
// Six interconnected pillars forming institutional-grade global capital coordination:
// 1. Global Capital Layer - Sovereign funds, institutional allocators, DAO treasuries
// 2. Global Liquidity Fabric - Cross-chain corridors, RWA bridges, institutional pools
// 3. AI Systemic Coordination - Exposure mapping, capital adequacy, stress simulation
// 4. Autonomous Monetary Infrastructure - Multi-asset reserves, emission control
// 5. Governance & Institutional Alignment - Jurisdiction modules, sovereign onboarding
// 6. Interoperability & Global Integration - Cross-chain messaging, bank connectors
// Note: Import AGFI module separately from '@tonaiagent/core/agfi'
// for full access to all AGFI types, managers, and factory functions
export * as AGFI from './agfi';

// Global Regulatory Integration Framework (GRIF)
// Six components enabling regulation-compatible infrastructure:
// 1. Jurisdiction-Aware Deployment - Region configs, fund classes, permissioned pools
// 2. Regulatory Mapping Matrix - Per-jurisdiction securities, custody, capital, KYC/AML rules
// 3. Compliance Module Interface - KYC, AML, custodian hooks, RWA compliance, reporting
// 4. Regulatory Transparency Portal - Stability index, capital adequacy, reserves, clearing stats
// 5. Audit & Attestation Layer - Third-party audits, proof-of-reserve, ZK disclosures
// 6. Regulatory Dialogue Framework - Whitepaper disclosures, regulator engagement tracking
// Note: Import GRIF module separately from '@tonaiagent/core/grif'
// for full access to all GRIF types, managers, and factory functions
export * as GRIF from './grif';
export {
  // Main GRIF manager
  GRIFManager,
  createGRIFManager,
  type GRIFManagerConfig,
  // Component factories
  createJurisdictionDeploymentLayer,
  createRegulatoryMappingMatrix,
  createComplianceModuleInterface,
  createTransparencyPortal,
  createAuditAttestationLayer,
  createRegulatoryDialogueFramework,
  // Component classes
  JurisdictionDeploymentLayer,
  RegulatoryMappingMatrix,
  ComplianceModuleInterface,
  TransparencyPortal,
  AuditAttestationLayer,
  RegulatoryDialogueFramework,
  // Key types
  type GRIFConfig,
  type GRIFStatusReport,
  type GRIFJurisdictionCode,
  type GRIFRegionCode,
  type GRIFRiskLevel,
  type RegulatoryStatus as GRIFRegulatoryStatus,
  type ComplianceModule,
  type RegulatoryMapping,
  type Attestation,
  type AuditRecord,
  type RegulatoryDocument,
  type RegulatorEngagement,
  type TransparencyPortalData,
  type GRIFEvent,
  type GRIFEventCallback,
} from './grif';

// AI-native Financial Operating System (AIFOS)
// A programmable, modular, AI-coordinated financial OS for capital markets & global finance.
// Six-layer architecture (bottom-up):
// 1. Financial Kernel - Capital state, risk boundaries, monetary control, governance execution
// 2. Financial Modules - Asset, liquidity, clearing, treasury, compliance modules
// 3. AI Orchestration Layer - Agent decisions, risk recalibration, capital reallocation, crisis response
// 4. Application Layer - AI hedge funds, institutional vaults, sovereign nodes, strategy marketplaces
// 5. Permission & Identity Layer - Role management, node permissions, governance delegation
// 6. Interoperability Layer - Cross-chain abstraction, external APIs, protocol bridges
// Note: Import AIFOS module separately from '@tonaiagent/core/aifos'
// for full access to all AIFOS types, managers, and factory functions
export * as AIFOS from './aifos';
export {
  // Main AIFOS manager
  DefaultAIFOSManager,
  createAIFOSManager,
  type AIFOSManager,
  type AIFOSConfig,
  type AIFOSSystemStatus,
  // Financial Kernel
  DefaultFinancialKernel,
  createFinancialKernel,
  type FinancialKernel,
  type FinancialKernelConfig,
  type KernelValidationResult,
  type KernelBoundaryResult,
  // Financial Modules
  DefaultFinancialModules,
  createFinancialModules,
  type FinancialModules,
  type FinancialModulesConfig,
  type ModulesHealthSummary,
  // AI Orchestration Layer
  DefaultAIOrchestrationLayer,
  createAIOrchestrationLayer,
  type AIOrchestrationLayer,
  type AIOrchestrationConfig,
  type OrchestrationMetrics,
  // Application Layer
  DefaultApplicationLayer,
  createApplicationLayer,
  type ApplicationLayer,
  type ApplicationLayerConfig,
  type EcosystemMetrics,
  // Permission & Identity Layer
  DefaultPermissionIdentityLayer,
  createPermissionIdentityLayer,
  type PermissionIdentityLayer,
  type PermissionIdentityConfig,
  // Interoperability Layer
  DefaultInteroperabilityLayer,
  createInteroperabilityLayer,
  type InteroperabilityLayer,
  type InteropSummary,
  // Key types
  type KernelState,
  type KernelParameters,
  type AIFOSEvent,
  type AIFOSEventCallback,
} from './aifos';

// Sovereign Digital Asset Coordination Layer (SDACL)
// Five components enabling sovereign digital asset coordination:
// 1. CBDC Integration Interface - Issuer verification, supply validation, settlement routing
// 2. Sovereign Treasury Bridge - Treasury allocations, bond issuance, reserve visibility
// 3. Cross-Sovereign Coordination Engine - AI capital flows, liquidity balancing, risk management
// 4. Jurisdiction Enforcement Layer - Geographic restrictions, eligibility, sanction-aware routing
// 5. Sovereign Transparency Dashboard - Exposure metrics, compliance reporting, alerts
// Note: Import SDACL module separately from '@tonaiagent/core/sdacl'
// for full access to all SDACL types, managers, and factory functions
export * as SDACL from './sdacl';
export {
  // Main SDACL manager
  DefaultSDACLService,
  createSDACLService,
  // Component factories
  createCBDCIntegrationManager,
  createSovereignTreasuryBridgeManager,
  createCrossSovereignCoordinationManager,
  createJurisdictionEnforcementManager,
  createSovereignTransparencyManager,
  // Component classes
  DefaultCBDCIntegrationManager,
  DefaultSovereignTreasuryBridgeManager,
  DefaultCrossSovereignCoordinationManager,
  DefaultJurisdictionEnforcementManager,
  DefaultSovereignTransparencyManager,
  // Key types
  type SDACLConfig,
  type SDACLService,
  type SDACLSystemStatus,
  type SDACLEvent,
  type SDACLEventCallback,
  type SovereignAsset,
  type SovereignAssetId,
  type IssuerVerificationResult,
  type SettlementRoute,
  type TreasuryAllocation as SDACLTreasuryAllocation,
  type SovereignBond,
  type CrossBorderFlow,
  type LiquidityBalance,
  type JurisdictionRule,
  type ParticipantEligibility,
  type ExposureMetric,
  type ComplianceReport,
  type DashboardSnapshot,
  type DashboardAlert,
} from './sdacl';

// Production Agent Runtime (Issue #149)
// Core execution environment for autonomous financial agents on TON.
// Implements the full agent execution lifecycle, 9-step pipeline, simulation mode,
// risk controls, observability, and event system.
// Architecture: Agent Applications → Agent Runtime API → Execution Engine → Event Bus → State Store → Financial Infrastructure
// Note: Import separately from '@tonaiagent/core/agent-runtime' for full access.
export * as AgentRuntimeModule from './agent-runtime';
export {
  // Orchestrator
  AgentRuntimeOrchestrator,
  createAgentRuntimeOrchestrator,
  DEFAULT_RUNTIME_CONFIG,
  // Error
  AgentRuntimeError,
  // Types
  type AgentLifecycleState,
  type LifecycleTransitionReason,
  type LifecycleTransition,
  type PipelineStep,
  type PipelineStepStatus,
  type PipelineStepResult,
  type PipelineExecution,
  type SimulationConfig,
  type SimulatedTransaction,
  type RuntimeAgentConfig,
  type RuntimeRiskLimits,
  type RuntimeSchedule,
  type RuntimeAgentState,
  type AgentRuntimeConfig,
  type ObservabilityConfig,
  type OrchestratorMetrics as RuntimeOrchestratorMetrics,
  type OrchestratorHealth as RuntimeOrchestratorHealth,
  type RuntimeEventType,
  type RuntimeEvent,
  type RuntimeEventHandler,
  type RuntimeUnsubscribe,
  type AgentRuntimeErrorCode,
} from './agent-runtime';

// Live Trading Infrastructure (Issue #151)
// Enables AI agents to execute real trades through integrated liquidity venues.
// Supports DEX, CEX, and DeFi protocols — initially optimized for the TON ecosystem.
// Components:
//   1. Exchange Connector Layer — modular connectors for DEX/CEX/DeFi
//   2. Order Execution Engine   — routing, slippage control, retries, partial fills
//   3. Market Data Integration  — price feeds, order books, trade history, volatility
//   4. Risk Control Module      — pre-execution safety guardrails
//   5. Portfolio Synchronization — balances, positions, realized/unrealized PnL
//   6. Secure Key Management    — encrypted credentials, never exposed to agent logic
// Note: Import live-trading module separately from '@tonaiagent/core/live-trading'
// for full access to all types and factory functions.
export * as LiveTrading from './live-trading';
export {
  // Main infrastructure factory
  createLiveTradingInfrastructure,
  DefaultLiveTradingInfrastructure,
  // Connector layer
  createSimulatedConnector,
  createConnectorRegistry,
  isTerminalOrderStatus,
  ConnectorError,
  // Execution engine
  createExecutionEngine,
  ExecutionError,
  // Market data
  createMarketDataService,
  // Risk controls
  createRiskControlsService,
  buildRiskProfile,
  // Portfolio
  createPortfolioService,
  // Key management
  createKeyManagementService,
  KeyManagementError,
  // Key types
  type LiveTradingConfig,
  type LiveTradingHealth,
  type LiveTradingMetrics,
  type LiveTradingEvent,
  type LiveTradingEventCallback,
  type ExchangeConnectorConfig,
  type ExecutionRequest,
  type ExecutionResult,
  type PortfolioState,
  type PortfolioSummary,
  type RiskProfile,
  type RiskCheckResult as LiveTradingRiskCheckResult,
} from './live-trading';

// AI Fund Manager (Issue #152)
// Enables creation and management of AI-driven investment funds that allocate
// capital across multiple strategies from the Strategy Marketplace, rebalance
// portfolios automatically, manage risk exposure, track performance metrics,
// and distribute fees to fund creators, strategy developers, and the platform.
// Architecture: Investors → AI Fund Manager → Allocation Engine → Strategy Agents → Live Trading
// Note: Import separately from '@tonaiagent/core/fund-manager' for full access.
export * as FundManager from './fund-manager';
export {
  // Main fund manager factory
  createAIFundManager,
  AIFundManager,
  DEFAULT_FUND_MANAGER_CONFIG,
  // Component factories (aliased to avoid conflicts with investment module)
  createFundCreationManager,
  createAllocationEngine as createFundAllocationEngine,
  createRebalancingEngine,
  createRiskManagementService as createFundRiskManagementService,
  createInvestorParticipationManager,
  createPerformanceTrackingService as createFundPerformanceTrackingService,
  createFeeDistributionEngine,
  // Error
  FundManagerError,
  // Key types (aliased to avoid conflicts)
  type AIFundManagerConfig,
  type FundConfig,
  type FundLifecycleState,
  type FundType,
  type FundBaseAsset,
  type FundRiskProfile,
  type FundPortfolio,
  type StrategyAllocation as FundStrategyAllocation,
  type FundRiskLimits,
  type FundRiskStatus,
  type FundPerformanceMetrics,
  type AumSnapshot,
  type InvestorPosition,
  type DepositResult as FundDepositResult,
  type WithdrawResult,
  type AllocationResult as FundAllocationResult,
  type RebalancingPlan,
  type RebalancingResult,
  type RebalanceTrigger,
  type FeeCollectionEvent,
  type FeeEarnings,
  type FundManagerMetrics,
  type FundManagerHealth,
  type FundManagerEvent,
  type FundManagerEventHandler,
  type FundManagerUnsubscribe,
  type FundManagerErrorCode,
} from './fund-manager';

// Agent Developer SDK (Issue #158)
// Standardized framework for building, testing, and deploying autonomous agents.
// Components:
//   1. Agent Development Framework — standardized agent structure (strategy, risk_rules,
//      execution_logic, configuration, event_handlers)
//   2. Runtime Integration API — getMarketData, placeOrder, getPortfolio, allocateCapital,
//      getRiskMetrics
//   3. Strategy Development Toolkit — templates, example algorithms, risk helpers, utilities
//   4. Backtesting Compatibility Layer — simulate, analyze, validate agents over historical data
// Architecture: Developer → Agent SDK → Agent Runtime API → Production Agent Runtime → Trading Infrastructure
// Note: Import separately from '@tonaiagent/core/sdk' for full access.
export * as AgentDeveloperSDK from './sdk';
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
} from './sdk';

// Strategy Marketplace MVP (Issue #201)
// Unified integration layer connecting Strategy Engine, Marketplace, and Agent Runtime.
// Provides pre-registered marketplace strategies, strategy metadata for listing,
// strategy deployment to agents, and performance tracking integration.
// Enables: strategy discovery, deployment, reputation, and sharing.
// Note: Import separately from '@tonaiagent/core/strategy-marketplace' for full access.
export * as StrategyMarketplaceMVP from './strategy-marketplace';
export {
  // Marketplace
  DefaultStrategyMarketplace,
  createStrategyMarketplace,
  // Built-in strategies
  BUILTIN_STRATEGIES,
  // Backtesting Integration (Issue #202)
  DefaultMarketplaceBacktester,
  createMarketplaceBacktester,
  parseCLIBacktestArgs,
  runCLIBacktest,
  formatCLIBacktestResult,
  // Types
  type MarketplaceStrategyCategory,
  type MarketplaceRiskLevel,
  type MarketplaceStrategyListing,
  type DeployMarketplaceStrategyInput,
  type MarketplaceDeployedAgent,
  type MarketplaceStrategyFilter,
  type StrategyMarketplace,
  // Backtesting Types (Issue #202)
  type BacktestTimeframe,
  type MarketplaceBacktestConfig,
  type BacktestResultSummary,
  type MarketplaceBacktestResult,
  type BacktestComparisonResult,
  type MarketplaceBacktester,
  type CLIBacktestConfig,
} from './strategy-marketplace';

// Portfolio Engine (Issue #214)
// Persistent portfolio tracking for AI trading agents including:
//   1. Portfolio Management   — create, update, query agent portfolios
//   2. Trade History System   — complete trade recording and filtering
//   3. Position Tracking      — open positions, averaging, closing
//   4. Balance Management     — multi-asset balance tracking
//   5. PnL Metrics            — realized/unrealized PnL, ROI, win rate
//   6. Portfolio API          — REST endpoints for portfolio data
// Architecture: Agent Runtime → Trade Execution → Portfolio Engine → Database Storage → Analytics/Dashboard
// Note: Import separately from '@tonaiagent/core/portfolio' for full access.
export * as PortfolioEngine from './portfolio';
export {
  // Storage
  PortfolioStorage,
  createPortfolioStorage,
  createDemoPortfolioStorage,
  // Engine
  PortfolioEngine as PortfolioEngineClass,
  createPortfolioEngine,
  createDemoPortfolioEngine,
  // API
  PortfolioApi,
  createPortfolioApi,
  createDemoPortfolioApi,
  // Error
  PortfolioError,
  // Config
  DEFAULT_PORTFOLIO_ENGINE_CONFIG,
  // Key types
  type Portfolio,
  type Position,
  type Trade,
  type BalanceRecord,
  type PortfolioSummary as PortfolioEngineSummary,
  type PortfolioMetrics,
  type TradeSide,
  type PositionStatus,
  type TradeFilter,
  type PortfolioEngineConfig,
  type PortfolioEvent,
  type PortfolioEventType,
  type PortfolioEventHandler,
  type PortfolioUnsubscribe,
  type PortfolioErrorCode,
  type PortfolioApiRequest,
  type PortfolioApiResponse,
  type PortfolioOverviewResponse,
  type TradeHistoryResponse,
  type PositionsResponse,
  type ExecuteTradeRequest,
  type ExecuteTradeResult,
} from './portfolio';
