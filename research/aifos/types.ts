/**
 * TONAIAgent - AI-native Financial Operating System (AIFOS) Types
 *
 * Core type definitions for the AI-native Financial Operating System,
 * an OS-level abstraction that unifies all financial infrastructure into
 * a programmable, modular, AI-coordinated operating system for global finance.
 *
 * Comparable in abstraction to:
 * - Microsoft Windows (OS layer for applications)
 * - Apple iOS (ecosystem OS model)
 * - Linux Foundation Linux (modular open architecture)
 *
 * But for capital markets & global finance.
 *
 * OS Architecture Layers:
 * 1. Financial Kernel        - Immutable logic core: capital state, risk, monetary, governance
 * 2. Financial Modules       - Plug-in modules: assets, liquidity, clearing, treasury, compliance
 * 3. AI Orchestration Layer  - Agent decisions, risk recalibration, capital reallocation
 * 4. Application Layer       - AI hedge funds, vaults, sovereign nodes, strategy marketplaces
 * 5. Permission & Identity   - Institutional roles, node permissions, governance delegation
 * 6. Interoperability Layer  - Cross-chain abstraction, external APIs, protocol-to-protocol
 */

// ============================================================================
// Primitive ID Types
// ============================================================================

export type AIFOSId = string;
export type KernelId = string;
export type ModuleId = string;
export type AppId = string;
export type IdentityId = string;
export type ProcessId = string;

// ============================================================================
// Enumerations
// ============================================================================

export type KernelState =
  | 'initializing'
  | 'running'
  | 'degraded'
  | 'emergency'
  | 'maintenance'
  | 'halted';

export type ModuleType =
  | 'asset'
  | 'liquidity'
  | 'clearing'
  | 'treasury'
  | 'compliance'
  | 'sovereign_gateway'
  | 'risk'
  | 'monetary';

export type ModuleStatus = 'active' | 'loading' | 'suspended' | 'error' | 'deprecated';

export type AppType =
  | 'ai_hedge_fund'
  | 'institutional_vault'
  | 'sovereign_allocation_node'
  | 'strategy_marketplace'
  | 'retail_finance_app'
  | 'dao_treasury'
  | 'autonomous_fund';

export type OrchestrationMode =
  | 'autonomous'
  | 'supervised'
  | 'manual'
  | 'emergency_override';

export type RiskCapLevel = 'minimal' | 'low' | 'moderate' | 'elevated' | 'high' | 'critical';

export type GovernanceOverrideType =
  | 'parameter_update'
  | 'module_suspend'
  | 'emergency_halt'
  | 'risk_cap_adjustment'
  | 'app_permission_change';

export type IdentityRole =
  | 'kernel_admin'
  | 'module_operator'
  | 'app_developer'
  | 'institutional_node'
  | 'sovereign_node'
  | 'auditor'
  | 'governance_delegate'
  | 'compliance_officer';

export type PermissionScope =
  | 'kernel_read'
  | 'kernel_write'
  | 'module_deploy'
  | 'module_upgrade'
  | 'module_suspend'
  | 'app_register'
  | 'app_execute'
  | 'capital_allocate'
  | 'governance_vote'
  | 'governance_propose'
  | 'compliance_gate'
  | 'emergency_action';

export type InteropProtocol =
  | 'cross_chain_message'
  | 'rest_api'
  | 'grpc'
  | 'websocket'
  | 'fix_protocol'
  | 'swift_gateway'
  | 'iso20022'
  | 'on_chain_call';

export type AIFOSEventType =
  | 'kernel_state_changed'
  | 'module_loaded'
  | 'module_suspended'
  | 'module_upgraded'
  | 'agent_decision_executed'
  | 'risk_cap_triggered'
  | 'governance_override_applied'
  | 'stability_index_alert'
  | 'capital_reallocated'
  | 'app_registered'
  | 'app_launched'
  | 'identity_granted'
  | 'identity_revoked'
  | 'interop_channel_opened'
  | 'interop_message_sent'
  | 'emergency_halt_triggered'
  | 'kernel_parameter_updated';

// ============================================================================
// Financial Kernel Types
// ============================================================================

export interface KernelParameters {
  maxSystemCapital: number;           // USD — hard cap on total managed capital
  globalRiskCap: RiskCapLevel;        // System-wide risk ceiling
  stabilityIndexThreshold: number;    // 0-100; below this triggers alerts
  monetaryAdjustmentEnabled: boolean;
  governanceQuorum: number;           // % of voting power required
  emergencyHaltEnabled: boolean;
  maxSingleModuleExposurePercent: number;
  crossModuleRiskCorrelationLimit: number; // 0-1
}

export interface KernelCapitalState {
  totalManagedCapital: number;   // USD
  allocatedCapital: number;      // USD
  reserveCapital: number;        // USD
  pendingCapital: number;        // USD
  lastUpdatedAt: Date;
}

export interface KernelRiskState {
  currentRiskLevel: RiskCapLevel;
  stabilityIndex: number;         // 0-100
  activeBreaches: number;
  lastAssessedAt: Date;
  riskFactors: KernelRiskFactor[];
}

export interface KernelRiskFactor {
  name: string;
  score: number; // 0-100
  weight: number; // contribution to overall risk
  source: 'module' | 'external' | 'market' | 'governance';
}

export interface KernelGovernanceState {
  pendingProposals: number;
  activeOverrides: number;
  lastGovernanceActionAt?: Date;
  constitutionVersion: string;
}

export interface KernelMonetaryState {
  activeEmissionControls: number;
  reserveStabilityScore: number; // 0-100
  totalReserveValueUSD: number;
  lastMonetaryAdjustmentAt?: Date;
}

export interface FinancialKernelConfig {
  parameters: Partial<KernelParameters>;
  enableConstitutionalBounds: boolean;
  enableRealTimeRiskMonitoring: boolean;
  riskAssessmentIntervalMs: number;
  capitalStateSnapshotIntervalMs: number;
}

// ============================================================================
// Financial Modules Types
// ============================================================================

export interface FinancialModuleManifest {
  id: ModuleId;
  name: string;
  version: string;
  moduleType: ModuleType;
  description: string;
  apiVersion: string;
  requiredPermissions: PermissionScope[];
  constitutionalLimits: ModuleConstitutionalLimit[];
  dependencies: ModuleId[];
  upgradeable: boolean;
  author: string;
  registeredAt: Date;
  lastUpgradedAt?: Date;
  status: ModuleStatus;
  metadata: Record<string, unknown>;
}

export interface ModuleConstitutionalLimit {
  limitType: 'capital_cap' | 'risk_cap' | 'rate_limit' | 'jurisdiction_restriction' | 'asset_class_restriction';
  value: number | string;
  enforcement: 'hard' | 'soft';
  description: string;
}

export interface ModuleAPIContract {
  moduleId: ModuleId;
  endpoints: ModuleEndpoint[];
  eventTypes: string[];
  schemaVersion: string;
  definedAt: Date;
}

export interface ModuleEndpoint {
  name: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  requiresPermission: PermissionScope;
  rateLimitPerMinute: number;
}

export interface ModuleExecutionResult {
  moduleId: ModuleId;
  operation: string;
  success: boolean;
  output?: unknown;
  error?: string;
  durationMs: number;
  capitalImpact?: number;
  riskImpact?: number;
  executedAt: Date;
}

export interface FinancialModulesConfig {
  enableHotReload: boolean;
  enforceConstitutionalLimits: boolean;
  maxConcurrentModuleOperations: number;
  moduleTimeoutMs: number;
  enableModuleAuditLog: boolean;
}

// ============================================================================
// AI Orchestration Layer Types
// ============================================================================

export interface AgentDecision {
  id: ProcessId;
  agentId: string;
  decisionType: 'capital_reallocation' | 'risk_recalibration' | 'module_call' | 'governance_signal' | 'crisis_response';
  rationale: string;
  targetModules: ModuleId[];
  proposedActions: AgentAction[];
  estimatedRiskImpact: number;     // -100 to +100 (negative = risk reduction)
  estimatedCapitalImpact: number;  // USD
  requiresHumanApproval: boolean;
  status: 'proposed' | 'approved' | 'executing' | 'completed' | 'rejected' | 'rolled_back';
  proposedAt: Date;
  decidedAt?: Date;
  executedAt?: Date;
}

export interface AgentAction {
  actionType: string;
  targetModuleId: ModuleId;
  parameters: Record<string, unknown>;
  expectedOutcome: string;
  rollbackAvailable: boolean;
}

export interface RiskRecalibrationEvent {
  id: string;
  trigger: 'market_signal' | 'stability_index' | 'module_breach' | 'external_alert' | 'scheduled';
  previousRiskLevel: RiskCapLevel;
  newRiskLevel: RiskCapLevel;
  stabilityIndexBefore: number;
  stabilityIndexAfter: number;
  actionsTriggered: string[];
  triggeredAt: Date;
  resolvedAt?: Date;
}

export interface CrisisResponsePlan {
  id: string;
  scenarioType: 'liquidity_crisis' | 'market_crash' | 'regulatory_shock' | 'protocol_failure' | 'systemic_contagion';
  severityThreshold: RiskCapLevel;
  automatedActions: AgentAction[];
  requiresGovernanceApproval: boolean;
  estimatedResponseTimeMs: number;
  lastTestedAt?: Date;
  isActive: boolean;
}

export interface OrchestrationBoundary {
  boundaryType: 'risk_cap' | 'governance_override' | 'stability_trigger' | 'capital_limit';
  threshold: number;
  enforcement: 'hard_stop' | 'alert' | 'auto_recalibrate';
  isTriggered: boolean;
  triggeredAt?: Date;
  description: string;
}

export interface AIOrchestrationConfig {
  mode: OrchestrationMode;
  maxAutonomousCapitalUSD: number;   // Max capital an agent can move without approval
  riskCapHardStop: RiskCapLevel;     // Level at which all agent actions pause
  stabilityIndexHardStop: number;    // 0-100; below triggers emergency
  enableCrisisAutoResponse: boolean;
  decisionAuditEnabled: boolean;
  maxDecisionsPerHour: number;
}

// ============================================================================
// Application Layer Types
// ============================================================================

export interface AIFOSApplication {
  id: AppId;
  name: string;
  appType: AppType;
  developer: IdentityId;
  version: string;
  description: string;
  requiredModules: ModuleId[];
  requiredPermissions: PermissionScope[];
  capitalBudget?: number;           // USD — max capital app can manage
  riskBudget?: RiskCapLevel;        // Max risk tier app can operate in
  jurisdictionScope: string[];      // ISO country codes or 'global'
  status: 'registered' | 'active' | 'paused' | 'suspended' | 'deprecated';
  registeredAt: Date;
  lastActiveAt?: Date;
  metadata: Record<string, unknown>;
}

export interface AppSDKCapability {
  capabilityId: string;
  name: string;
  description: string;
  moduleId: ModuleId;
  requiredPermission: PermissionScope;
  apiEndpoint: string;
  schemaVersion: string;
}

export interface AppMarketplaceEntry {
  appId: AppId;
  displayName: string;
  category: AppType;
  tags: string[];
  rating: number; // 0-5
  installCount: number;
  monthlyActiveUsers: number;
  pricing: 'free' | 'subscription' | 'usage_based' | 'revenue_share';
  listedAt: Date;
  featured: boolean;
}

export interface ApplicationLayerConfig {
  enableAppMarketplace: boolean;
  requireAppAuditForCapitalAccess: boolean;
  maxAppsPerDeveloper: number;
  appCapitalBudgetDefaultUSD: number;
  sandboxModeEnabled: boolean;
}

// ============================================================================
// Permission & Identity Layer Types
// ============================================================================

export interface AIFOSIdentity {
  id: IdentityId;
  name: string;
  identityType: 'individual' | 'institution' | 'sovereign' | 'ai_agent' | 'module' | 'app';
  roles: IdentityRole[];
  permissions: PermissionScope[];
  jurisdiction?: string;
  complianceStatus: 'unverified' | 'verified' | 'enhanced' | 'suspended';
  kycLevel: 'none' | 'basic' | 'institutional' | 'sovereign';
  delegations: GovernanceDelegation[];
  nodeAccess?: NodeAccessGrant;
  issuedAt: Date;
  expiresAt?: Date;
  lastAuthenticatedAt?: Date;
  metadata: Record<string, unknown>;
}

export interface GovernanceDelegation {
  id: string;
  delegatorId: IdentityId;
  delegateeId: IdentityId;
  scope: PermissionScope[];
  votingPowerPercent: number; // 0-100
  validFrom: Date;
  validUntil?: Date;
  revocable: boolean;
  isActive: boolean;
}

export interface NodeAccessGrant {
  nodeId: string;
  nodeType: 'institutional' | 'sovereign' | 'validator' | 'oracle';
  accessLevel: 'read' | 'execute' | 'admin';
  grantedAt: Date;
  expiresAt?: Date;
}

export interface ComplianceGate {
  gateId: string;
  name: string;
  requiredKycLevel: 'basic' | 'institutional' | 'sovereign';
  requiredJurisdictions: string[];
  blockedJurisdictions: string[];
  requiredRoles: IdentityRole[];
  enforcedOn: PermissionScope[];
  isActive: boolean;
}

export interface PermissionIdentityConfig {
  enableRoleBasedAccess: boolean;
  enableNodePermissions: boolean;
  enableGovernanceDelegation: boolean;
  enableComplianceGating: boolean;
  identityExpiryDays: number;
  requireMFAForKernelWrite: boolean;
}

// ============================================================================
// Interoperability Layer Types
// ============================================================================

export interface InteropChannel {
  id: string;
  name: string;
  protocol: InteropProtocol;
  sourceEndpoint: string;
  destinationEndpoint: string;
  sourceChain?: string;
  destinationChain?: string;
  direction: 'inbound' | 'outbound' | 'bidirectional';
  encryptionEnabled: boolean;
  authMethod: 'api_key' | 'oauth2' | 'mtls' | 'on_chain_signature';
  status: 'active' | 'degraded' | 'offline' | 'testing';
  latencyMs: number;
  throughputPerSecond: number;
  openedAt: Date;
  lastActivityAt?: Date;
}

export interface ExternalAPIIntegration {
  id: string;
  name: string;
  provider: string;
  integrationCategory: 'market_data' | 'compliance' | 'custody' | 'banking' | 'oracle' | 'regulatory';
  baseUrl: string;
  version: string;
  authMethod: string;
  rateLimitPerMinute: number;
  healthStatus: 'healthy' | 'degraded' | 'offline';
  lastHealthCheckAt: Date;
  registeredAt: Date;
}

export interface ProtocolBridge {
  id: string;
  bridgeName: string;
  sourceProtocol: string;
  targetProtocol: string;
  supportedAssets: string[];
  supportedChains: string[];
  translationCapabilities: string[];
  securityModel: 'trustless' | 'trusted_relayer' | 'multi_sig' | 'zk_proof';
  auditStatus: 'unaudited' | 'audited' | 'continuously_monitored';
  status: 'active' | 'paused' | 'deprecated';
  registeredAt: Date;
}

export interface InteropLayerConfig {
  enableCrossChainAbstraction: boolean;
  enableExternalAPIIntegration: boolean;
  enableProtocolBridges: boolean;
  maxChannelLatencyMs: number;
  messageRetryMax: number;
  messageTimeoutMs: number;
  enableInteropAuditLog: boolean;
}

// ============================================================================
// AIFOS System-Level Types
// ============================================================================

export interface AIFOSSystemStatus {
  kernelState: KernelState;
  kernelVersion: string;
  // Capital & Risk
  totalManagedCapitalUSD: number;
  currentRiskLevel: RiskCapLevel;
  stabilityIndex: number;
  activeRiskBreaches: number;
  // Modules
  totalModules: number;
  activeModules: number;
  moduleErrors: number;
  // Orchestration
  orchestrationMode: OrchestrationMode;
  activeAgentDecisions: number;
  completedAgentDecisions: number;
  crisisResponsePlansActive: number;
  // Applications
  registeredApps: number;
  activeApps: number;
  // Identity & Permissions
  totalIdentities: number;
  activeGovernanceDelegations: number;
  activeComplianceGates: number;
  // Interoperability
  activeInteropChannels: number;
  registeredExternalAPIs: number;
  activeProtocolBridges: number;
  // Meta
  uptimeSeconds: number;
  generatedAt: Date;
}

export interface AIFOSConfig {
  kernel?: Partial<FinancialKernelConfig>;
  modules?: Partial<FinancialModulesConfig>;
  orchestration?: Partial<AIOrchestrationConfig>;
  applications?: Partial<ApplicationLayerConfig>;
  permissionIdentity?: Partial<PermissionIdentityConfig>;
  interoperability?: Partial<InteropLayerConfig>;
}

// ============================================================================
// Event Types
// ============================================================================

export interface AIFOSEvent {
  id: string;
  type: AIFOSEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export type AIFOSEventCallback = (event: AIFOSEvent) => void;
