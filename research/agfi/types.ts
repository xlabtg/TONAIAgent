/**
 * TONAIAgent - AI-native Global Financial Infrastructure (AGFI) Types
 *
 * Core type definitions for the AI-native Global Financial Infrastructure,
 * representing the formalization of TON AI Agent platform as institutional-grade
 * global capital coordination infrastructure comparable in systemic importance to
 * SWIFT, IMF, and BIS — but with AI-coordination, on-chain transparency,
 * programmability, and borderless design.
 *
 * Architecture Pillars:
 * 1. Global Capital Layer - Sovereign funds, institutional allocators, DAO treasuries
 * 2. Global Liquidity Fabric - Cross-chain liquidity, institutional corridors, RWA bridges
 * 3. AI Systemic Coordination Layer - Exposure mapping, capital adequacy, systemic risk
 * 4. Autonomous Monetary Infrastructure - Multi-asset treasury, cross-chain reserves
 * 5. Governance & Institutional Alignment - Jurisdiction-aware governance, sovereign onboarding
 * 6. Interoperability & Global Integration - Cross-chain messaging, institutional APIs
 */

// ============================================================================
// Enumerations
// ============================================================================

export type AGFIId = string;
export type InstitutionId = string;
export type JurisdictionCode = string;
export type CapitalFlowId = string;
export type LiquidityCorridorId = string;
export type GovernanceModuleId = string;

export type InstitutionType =
  | 'sovereign_fund'
  | 'institutional_allocator'
  | 'dao_treasury'
  | 'family_office'
  | 'autonomous_ai_fund'
  | 'central_bank'
  | 'commercial_bank'
  | 'hedge_fund'
  | 'pension_fund'
  | 'insurance_fund'
  | 'endowment';

export type CapitalFlowType =
  | 'cross_border_allocation'
  | 'liquidity_injection'
  | 'collateral_transfer'
  | 'reserve_rebalance'
  | 'institutional_settlement'
  | 'rwa_deployment'
  | 'protocol_treasury_contribution';

export type LiquidityRouteType =
  | 'direct_bridge'
  | 'atomic_swap'
  | 'synthetic_routing'
  | 'institutional_corridor'
  | 'rwa_bridge'
  | 'otc_settlement';

export type SystemicRiskLevel =
  | 'minimal'
  | 'low'
  | 'moderate'
  | 'elevated'
  | 'high'
  | 'critical'
  | 'systemic';

export type MonetaryAdjustmentType =
  | 'emission_increase'
  | 'emission_decrease'
  | 'reserve_injection'
  | 'reserve_withdrawal'
  | 'rate_adjustment'
  | 'collateral_ratio_change'
  | 'stability_buffer_deployment';

export type GovernanceActionType =
  | 'parameter_update'
  | 'jurisdiction_rule_add'
  | 'jurisdiction_rule_update'
  | 'sovereign_onboarding'
  | 'compliance_bridge_update'
  | 'advisory_vote'
  | 'emergency_action';

export type IntegrationProtocol =
  | 'cross_chain_message'
  | 'institutional_api'
  | 'bank_connector'
  | 'custodian_bridge'
  | 'rwa_custodial_map'
  | 'swift_gateway'
  | 'regulatory_feed';

export type ChainId =
  | 'ton'
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'solana'
  | 'avalanche'
  | 'bsc'
  | 'cosmos'
  | 'polkadot'
  | 'near';

export type AGFIEventType =
  | 'capital_flow_initiated'
  | 'capital_flow_settled'
  | 'liquidity_corridor_opened'
  | 'liquidity_corridor_closed'
  | 'systemic_risk_alert'
  | 'systemic_risk_resolved'
  | 'monetary_adjustment_triggered'
  | 'monetary_adjustment_executed'
  | 'governance_action_proposed'
  | 'governance_action_executed'
  | 'institution_onboarded'
  | 'institution_suspended'
  | 'interop_message_sent'
  | 'interop_message_received'
  | 'regulatory_sync_completed'
  | 'capital_adequacy_breach'
  | 'stress_simulation_completed';

// ============================================================================
// Global Capital Layer Types
// ============================================================================

export interface GlobalInstitution {
  id: InstitutionId;
  name: string;
  type: InstitutionType;
  jurisdiction: JurisdictionCode;
  aum: number; // Assets under management (USD)
  allocatedToAGFI: number; // Capital allocated to AGFI
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  regulatoryStatus: 'pending' | 'approved' | 'suspended' | 'restricted';
  complianceTier: 'retail' | 'professional' | 'institutional' | 'sovereign';
  kycStatus: 'pending' | 'verified' | 'enhanced' | 'ongoing';
  onboardedAt: Date;
  lastActivityAt: Date;
  metadata: Record<string, unknown>;
}

export interface CrossBorderCapitalFlow {
  id: CapitalFlowId;
  sourceInstitutionId: InstitutionId;
  destinationInstitutionId: InstitutionId;
  sourceJurisdiction: JurisdictionCode;
  destinationJurisdiction: JurisdictionCode;
  flowType: CapitalFlowType;
  assetClass: string;
  amount: number;
  currency: string;
  regulatoryApproval: boolean;
  complianceChecks: ComplianceCheckResult[];
  routingPath: string[];
  estimatedSettlementTime: number; // Minutes
  actualSettlementTime?: number; // Minutes
  status: 'pending' | 'in_transit' | 'settled' | 'rejected' | 'cancelled';
  initiatedAt: Date;
  settledAt?: Date;
  metadata: Record<string, unknown>;
}

export interface ComplianceCheckResult {
  checkType: 'kyc' | 'aml' | 'sanctions' | 'tax_reporting' | 'regulatory_limit' | 'jurisdiction_rule';
  passed: boolean;
  details: string;
  checkedAt: Date;
}

export interface CapitalAllocationStrategy {
  institutionId: InstitutionId;
  targetAllocations: TargetAllocation[];
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  riskBudget: number; // Max VaR %
  liquidityRequirement: number; // Min liquid % of portfolio
  jurisdictionalLimits: JurisdictionalLimit[];
  lastRebalancedAt?: Date;
  nextRebalanceAt: Date;
}

export interface TargetAllocation {
  category: string; // Asset class or protocol type
  targetPercent: number;
  minPercent: number;
  maxPercent: number;
  currentPercent: number;
}

export interface JurisdictionalLimit {
  jurisdiction: JurisdictionCode;
  maxExposurePercent: number;
  currentExposurePercent: number;
  requiresApproval: boolean;
}

export interface GlobalCapitalLayerConfig {
  maxInstitutionalAUM: number; // Max total AUM managed
  defaultComplianceTier: string;
  enableRegulatoryAwareDeployment: boolean;
  crossBorderSettlementTimeoutMinutes: number;
  minKycTierForCrossJurisdiction: string;
}

// ============================================================================
// Global Liquidity Fabric Types
// ============================================================================

export interface LiquidityCorridor {
  id: LiquidityCorridorId;
  name: string;
  sourceChain: ChainId;
  destinationChain: ChainId;
  sourceProtocol: string;
  destinationProtocol: string;
  corridorType: LiquidityRouteType;
  totalLiquidity: number;
  availableLiquidity: number;
  utilizationRate: number; // 0-1
  feePercent: number;
  estimatedLatencyMs: number;
  maxSingleTransfer: number;
  minSingleTransfer: number;
  status: 'active' | 'limited' | 'suspended' | 'maintenance';
  openedAt: Date;
  lastActivityAt: Date;
}

export interface CrossChainLiquidityRoute {
  id: string;
  corridors: LiquidityCorridorId[];
  totalHops: number;
  totalFeePercent: number;
  estimatedTotalLatencyMs: number;
  amount: number;
  asset: string;
  sourceChain: ChainId;
  destinationChain: ChainId;
  optimizedFor: 'speed' | 'cost' | 'liquidity';
  status: 'computed' | 'executing' | 'completed' | 'failed';
  computedAt: Date;
}

export interface InstitutionalLiquidityPool {
  id: string;
  name: string;
  participatingInstitutions: InstitutionId[];
  totalLiquidity: number;
  availableLiquidity: number;
  reservedLiquidity: number;
  assets: LiquidityAsset[];
  internalBorrowRate: number;
  internalLendRate: number;
  utilizationTarget: number;
  currentUtilization: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LiquidityAsset {
  assetId: string;
  assetName: string;
  chain: ChainId;
  amount: number;
  usdValue: number;
  liquidityDepth: 'high' | 'medium' | 'low';
}

export interface RWALiquidityBridge {
  id: string;
  rwaAssetId: string;
  rwaAssetName: string;
  custodian: string;
  onChainToken: string;
  onChainChain: ChainId;
  totalTokenized: number;
  liquidityDepth: number;
  redemptionTime: number; // Hours
  bridgeFee: number; // %
  status: 'active' | 'paused' | 'rebalancing';
  lastRedemption?: Date;
  lastMint?: Date;
}

export interface GlobalLiquidityFabricConfig {
  enableCrossChainLiquidity: boolean;
  enableInstitutionalCorridors: boolean;
  enableRWABridges: boolean;
  maxCorridorFeePercent: number;
  minLiquidityUtilizationTarget: number;
  maxSingleExposurePercent: number;
}

// ============================================================================
// AI Systemic Coordination Layer Types
// ============================================================================

export interface GlobalExposureMap {
  id: string;
  timestamp: Date;
  totalSystemExposure: number;
  byAssetClass: AssetClassExposure[];
  byChain: ChainSystemicExposure[];
  byJurisdiction: JurisdictionExposure[];
  byInstitution: InstitutionExposure[];
  concentrationRiskScore: number; // 0-100
  correlationRiskScore: number; // 0-100
  liquidityRiskScore: number; // 0-100
  overallSystemicRiskScore: number; // 0-100
  riskLevel: SystemicRiskLevel;
}

export interface AssetClassExposure {
  assetClass: string;
  totalExposure: number;
  percentOfSystem: number;
  liquidityScore: number;
  volatilityScore: number;
}

export interface ChainSystemicExposure {
  chain: ChainId;
  totalExposure: number;
  percentOfSystem: number;
  protocolConcentration: number; // Risk from concentration in few protocols
  bridgeRisk: number; // Risk from bridge dependencies
}

export interface JurisdictionExposure {
  jurisdiction: JurisdictionCode;
  totalExposure: number;
  percentOfSystem: number;
  regulatoryRiskScore: number;
  geopoliticalRiskScore: number;
}

export interface InstitutionExposure {
  institutionId: InstitutionId;
  institutionName: string;
  totalExposure: number;
  percentOfSystem: number;
  systemicImportance: 'low' | 'moderate' | 'high' | 'critical';
}

export interface CapitalAdequacyModel {
  id: string;
  institutionId: InstitutionId;
  timestamp: Date;
  totalCapital: number;
  riskWeightedAssets: number;
  capitalAdequacyRatio: number; // Capital / RWA
  tier1Capital: number;
  tier1Ratio: number;
  liquidityCoverageRatio: number;
  netStableFundingRatio: number;
  leverageRatio: number;
  bufferCapital: number; // Capital above minimum requirements
  breachWarning: boolean;
  breachCritical: boolean;
  modeledAt: Date;
}

export interface LiquidityStressSimulation {
  id: string;
  scenarioName: string;
  scenarioType: 'bank_run' | 'market_crash' | 'protocol_failure' | 'regulatory_shock' | 'geopolitical' | 'custom';
  shockMagnitude: number; // % impact
  affectedInstitutions: InstitutionId[];
  affectedChains: ChainId[];
  affectedJurisdictions: JurisdictionCode[];
  systemLiquidityImpact: number; // % reduction in system liquidity
  contagionProbability: number; // 0-1
  estimatedRecoveryTime: number; // Hours
  recommendedActions: string[];
  simulatedAt: Date;
}

export interface MacroStabilizationAction {
  id: string;
  trigger: string;
  triggerThreshold: number;
  actionType: MonetaryAdjustmentType;
  targetMetric: string;
  targetValue: number;
  currentValue: number;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  autoExecute: boolean;
  requiresGovernanceApproval: boolean;
  proposedAt: Date;
  executedAt?: Date;
  outcome?: string;
}

export interface AISystemicCoordinationConfig {
  exposureMapRefreshIntervalMs: number;
  capitalAdequacyCheckFrequency: 'realtime' | 'hourly' | 'daily';
  systemicRiskAlertThreshold: number; // 0-100
  enableAutoStabilization: boolean;
  stressSimulationFrequency: 'daily' | 'weekly';
  contagionModelEnabled: boolean;
}

// ============================================================================
// Autonomous Monetary Infrastructure Types
// ============================================================================

export interface MultiAssetReserve {
  id: string;
  name: string;
  totalValueUSD: number;
  assets: ReserveAsset[];
  allocationTargets: ReserveAllocationTarget[];
  rebalanceThreshold: number; // % drift before rebalance
  lastRebalancedAt?: Date;
  nextReviewAt: Date;
  stabilityScore: number; // 0-100
  liquidityScore: number; // 0-100
  diversificationScore: number; // 0-100
}

export interface ReserveAsset {
  assetId: string;
  assetName: string;
  chain: ChainId;
  amount: number;
  usdValue: number;
  targetPercent: number;
  currentPercent: number;
  yieldRate: number; // APY
  liquidityDepth: 'high' | 'medium' | 'low';
  custodian?: string;
}

export interface ReserveAllocationTarget {
  category: string; // 'stablecoin' | 'native_crypto' | 'rwa' | 'liquid_yield'
  targetPercent: number;
  minPercent: number;
  maxPercent: number;
}

export interface CrossChainReservePosition {
  id: string;
  chain: ChainId;
  protocol: string;
  assetId: string;
  amount: number;
  usdValue: number;
  yieldRate: number;
  lockupPeriod: number; // Days, 0 = liquid
  withdrawalTime: number; // Hours
  riskScore: number; // 0-100
  purpose: 'stability_buffer' | 'yield_generation' | 'liquidity_reserve' | 'collateral';
  createdAt: Date;
  matureAt?: Date;
}

export interface YieldBackedStabilization {
  id: string;
  totalYieldReserve: number;
  deployedForStabilization: number;
  availableForDeployment: number;
  yieldSources: YieldSource[];
  stabilizationHistory: StabilizationEvent[];
  targetStabilizationRatio: number; // Yield / Protocol TVL
  currentStabilizationRatio: number;
}

export interface YieldSource {
  protocolName: string;
  chain: ChainId;
  assetId: string;
  deployedCapital: number;
  annualYieldRate: number;
  accruedYield: number;
  lastHarvestAt?: Date;
}

export interface StabilizationEvent {
  id: string;
  timestamp: Date;
  trigger: string;
  capitalDeployed: number;
  impact: string;
  outcome: 'successful' | 'partial' | 'failed';
}

export interface EmissionControl {
  id: string;
  tokenAddress: string;
  chain: ChainId;
  currentEmissionRate: number; // Tokens per day
  targetEmissionRate: number;
  maxEmissionRate: number;
  minEmissionRate: number;
  adjustmentStep: number;
  adjustmentFrequency: 'hourly' | 'daily' | 'weekly';
  triggerMetrics: EmissionTriggerMetric[];
  lastAdjustedAt?: Date;
  nextReviewAt: Date;
}

export interface EmissionTriggerMetric {
  metric: 'price' | 'tvl' | 'staking_rate' | 'velocity' | 'governance_vote';
  threshold: number;
  adjustment: number; // % change in emission
  direction: 'above' | 'below';
}

export interface AutonomousMonetaryConfig {
  enableEmissionControl: boolean;
  enableCrossChainReserves: boolean;
  enableYieldBackedStabilization: boolean;
  reserveRebalanceFrequency: 'daily' | 'weekly';
  maxSingleChainExposurePercent: number;
  minStabilityScore: number; // 0-100
}

// ============================================================================
// Governance & Institutional Alignment Types
// ============================================================================

export interface JurisdictionModule {
  id: GovernanceModuleId;
  jurisdiction: JurisdictionCode;
  name: string;
  regulatoryFramework: string;
  supportedInstitutionTypes: InstitutionType[];
  complianceRules: JurisdictionRule[];
  reportingRequirements: ReportingRequirement[];
  kycAmlStandard: string;
  sanctionsLists: string[];
  effectiveDate: Date;
  reviewDate: Date;
  status: 'active' | 'pending_review' | 'deprecated';
}

export interface JurisdictionRule {
  id: string;
  ruleType: 'capital_limit' | 'position_limit' | 'reporting_threshold' | 'prohibited_activity' | 'disclosure_requirement';
  description: string;
  threshold?: number;
  currency?: string;
  enforcement: 'hard_block' | 'soft_block' | 'alert' | 'report';
  penaltyType?: string;
  lastUpdated: Date;
}

export interface ReportingRequirement {
  reportType: string;
  frequency: 'transaction' | 'daily' | 'monthly' | 'quarterly' | 'annual';
  threshold?: number; // Min amount that triggers reporting
  regulatorId: string;
  format: string;
  submissionDeadlineDays: number;
}

export interface SovereignOnboardingProfile {
  id: string;
  institutionId: InstitutionId;
  sovereignType: 'central_bank' | 'sovereign_wealth_fund' | 'state_pension' | 'governmental_agency';
  countryCode: string;
  regulatoryClassification: string;
  dueDiligenceLevel: 'standard' | 'enhanced' | 'ultra_high';
  onboardingStage: 'initial_contact' | 'due_diligence' | 'legal_review' | 'technical_integration' | 'pilot' | 'full_access';
  signedAgreements: string[];
  assignedJurisdictionModules: GovernanceModuleId[];
  customParameters: Record<string, unknown>;
  initiatedAt: Date;
  completedAt?: Date;
}

export interface InstitutionalComplianceBridge {
  id: string;
  bridgeName: string;
  targetSystem: string; // e.g., 'swift', 'iso20022', 'fedwire', 'sepa'
  supportedJurisdictions: JurisdictionCode[];
  complianceStandards: string[];
  encryptionProtocol: string;
  apiVersion: string;
  status: 'active' | 'testing' | 'deprecated';
  lastSyncAt?: Date;
  nextSyncAt?: Date;
}

export interface GovernanceProposal {
  id: string;
  proposalType: GovernanceActionType;
  title: string;
  description: string;
  proposedBy: string;
  targetModule: string;
  proposedChanges: Record<string, unknown>;
  jurisdictionalImpact: JurisdictionCode[];
  institutionalImpact: InstitutionId[];
  votingPeriodStart: Date;
  votingPeriodEnd: Date;
  quorumRequired: number; // % of voting power needed
  currentApprovalPercent: number;
  status: 'draft' | 'voting' | 'approved' | 'rejected' | 'executed' | 'cancelled';
  executedAt?: Date;
}

export interface GovernanceInstitutionalAlignmentConfig {
  enableJurisdictionModules: boolean;
  enableSovereignOnboarding: boolean;
  defaultGovernanceQuorum: number; // % voting power
  votingPeriodDays: number;
  enableComplianceBridges: boolean;
  requireMultiSignatureForSovereign: boolean;
}

// ============================================================================
// Interoperability & Global Integration Types
// ============================================================================

export interface CrossChainMessage {
  id: string;
  protocol: IntegrationProtocol;
  sourceChain: ChainId;
  destinationChain: ChainId;
  messageType: 'capital_intent' | 'settlement_confirmation' | 'governance_signal' | 'risk_alert' | 'liquidity_request';
  payload: Record<string, unknown>;
  priority: 'low' | 'standard' | 'high' | 'urgent';
  status: 'queued' | 'sending' | 'delivered' | 'acknowledged' | 'failed';
  sentAt: Date;
  deliveredAt?: Date;
  acknowledgedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

export interface InstitutionalAPIEndpoint {
  id: string;
  institutionId: InstitutionId;
  endpointType: 'rest' | 'graphql' | 'grpc' | 'websocket' | 'fix_protocol';
  url: string;
  version: string;
  capabilities: string[];
  authMethod: 'api_key' | 'oauth2' | 'mtls' | 'jwt';
  rateLimitPerMinute: number;
  status: 'active' | 'degraded' | 'offline';
  latencyMs: number;
  lastHealthCheck: Date;
}

export interface BankConnector {
  id: string;
  bankName: string;
  bankCountry: JurisdictionCode;
  connectorType: 'swift' | 'sepa' | 'fedwire' | 'chaps' | 'local_rtgs' | 'target2' | 'nss';
  supportedCurrencies: string[];
  settlementTime: number; // Hours
  status: 'connected' | 'limited' | 'disconnected';
  transactionFeeFixed: number;
  transactionFeePercent: number;
  maxTransactionAmount: number;
  lastSuccessfulTransactionAt?: Date;
}

export interface CustodianMapping {
  id: string;
  custodianName: string;
  custodianType: 'traditional' | 'crypto_native' | 'hybrid' | 'self_custody_tech';
  jurisdictions: JurisdictionCode[];
  supportedAssets: string[];
  supportedChains: ChainId[];
  segregationModel: 'full_segregation' | 'omnibus' | 'virtual_segregation';
  insuranceCoverage: number; // USD
  reportingFrequency: 'realtime' | 'daily' | 'weekly';
  apiIntegrated: boolean;
  status: 'active' | 'onboarding' | 'suspended';
}

export interface RWACustodialMapping {
  id: string;
  rwaAssetId: string;
  rwaType: 'real_estate' | 'private_credit' | 'treasury_bond' | 'commodity' | 'equity' | 'infrastructure';
  custodian: string;
  legalEntity: string;
  tokenContract: string;
  tokenChain: ChainId;
  underlyingCustodyJurisdiction: JurisdictionCode;
  totalTokenized: number;
  proofOfReserveUrl?: string;
  lastVerifiedAt?: Date;
  status: 'active' | 'redeemable' | 'frozen' | 'expired';
}

export interface GlobalIntegrationConfig {
  enableCrossChainMessaging: boolean;
  enableInstitutionalAPIs: boolean;
  enableBankConnectors: boolean;
  enableCustodianMapping: boolean;
  enableRWACustodialMapping: boolean;
  messagePriorityQueueEnabled: boolean;
  maxMessageRetries: number;
  messageTimeoutMs: number;
}

// ============================================================================
// AGFI System-Level Types
// ============================================================================

export interface AGFISystemStatus {
  // Global Capital Layer
  onboardedInstitutions: number;
  totalAUMManaged: number;
  activeCapitalFlows: number;
  settledCapitalFlows: number;
  // Global Liquidity Fabric
  activeLiquidityCorridors: number;
  totalLiquidityInFabric: number;
  activeRWABridges: number;
  // AI Systemic Coordination
  systemicRiskLevel: SystemicRiskLevel;
  systemicRiskScore: number;
  capitalAdequacyBreaches: number;
  activeStressSimulations: number;
  // Autonomous Monetary
  reserveStabilityScore: number;
  totalReserveValueUSD: number;
  activeEmissionControls: number;
  // Governance
  activeJurisdictionModules: number;
  pendingGovernanceProposals: number;
  sovereignOnboardingInProgress: number;
  // Interoperability
  activeIntegrations: number;
  messagesInFlight: number;
  connectedBanks: number;
  mappedCustodians: number;
  generatedAt: Date;
}

export interface AGFIConfig {
  globalCapitalLayer?: Partial<GlobalCapitalLayerConfig>;
  globalLiquidityFabric?: Partial<GlobalLiquidityFabricConfig>;
  aiSystemicCoordination?: Partial<AISystemicCoordinationConfig>;
  autonomousMonetary?: Partial<AutonomousMonetaryConfig>;
  governanceInstitutionalAlignment?: Partial<GovernanceInstitutionalAlignmentConfig>;
  globalIntegration?: Partial<GlobalIntegrationConfig>;
}

// ============================================================================
// Event Types
// ============================================================================

export interface AGFIEvent {
  id: string;
  type: AGFIEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export type AGFIEventCallback = (event: AGFIEvent) => void;
