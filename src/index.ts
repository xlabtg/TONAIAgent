/**
 * TONAIAgent Core
 *
 * Multi-provider AI layer with production-grade security, plugin system, strategy engine,
 * no-code strategy builder, marketplace, copy trading, institutional compliance,
 * omnichain infrastructure, agent launchpad, autonomous hedge fund infrastructure,
 * viral consumer growth engine, AI safety/alignment framework, ecosystem fund, TON Super App
 * (wallet, AI agents, social layer, Telegram Mini App), Telegram-native mobile-first UX,
 * AI-native personal finance, Open Agent Protocol, Enterprise SDK & Developer Platform,
 * token strategy (launch, liquidity flywheel, valuation, simulation), AI-native payments
 * and commerce layer, global regulatory strategy framework, and global institutional
 * network for autonomous finance on TON blockchain.
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
 * - Global expansion strategy and roadmap
 * - AI-powered institutional advantage (risk modeling, anomaly detection)
 * - Institutional governance (advisory boards, committees, policies)
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
