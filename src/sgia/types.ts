/**
 * TONAIAgent - Sovereign-Grade Institutional Alignment (SGIA) Types
 *
 * Core type definitions for the Sovereign-Grade Institutional Alignment framework
 * that enables sovereign wealth funds, central banks, national regulators,
 * institutional custodians, and Tier-1 financial institutions to interact with
 * the protocol in a compliant, structured, and controlled manner.
 *
 * Six Alignment Domains:
 * 1. Sovereign Integration Framework - Tokenized institutional vaults, permissioned fund classes
 * 2. Regulatory Compatibility Layer - KYC/AML plug-in modules, jurisdiction-aware deployment
 * 3. Institutional Custody Alignment - Multi-sig vaults, custodian API compatibility
 * 4. Transparency & Audit Framework - On-chain audit dashboards, real-time reporting
 * 5. Capital Adequacy & Reserve Model - Reserve requirements, liquidity buffers
 * 6. Sovereign Participation Modes - Observer / Allocator / Strategic Partner
 */

// ============================================================================
// ID and Scalar Types
// ============================================================================

export type SGIAId = string;
export type SovereignEntityId = string;
export type VaultId = string;
export type KycModuleId = string;
export type AuditRecordId = string;
export type CapitalModelId = string;
export type ParticipationId = string;
export type JurisdictionCode = string;

// ============================================================================
// Enumerations
// ============================================================================

export type SovereignEntityType =
  | 'sovereign_wealth_fund'
  | 'central_bank'
  | 'national_regulator'
  | 'state_pension_fund'
  | 'governmental_agency'
  | 'multilateral_institution'
  | 'tier1_bank'
  | 'institutional_custodian';

export type FundClass =
  | 'permissioned_institutional'
  | 'sovereign_reserved'
  | 'regulated_public'
  | 'restricted_private'
  | 'regulatory_sandbox';

export type VaultType =
  | 'institutional_vault'
  | 'sovereign_vault'
  | 'custodial_vault'
  | 'reserve_vault'
  | 'escrow_vault';

export type KycAmlTier =
  | 'standard'
  | 'enhanced'
  | 'sovereign_grade'
  | 'ultra_high_net_worth';

export type ParticipationMode =
  | 'observer'
  | 'allocator'
  | 'strategic_partner'
  | 'regulatory_node'
  | 'custodian_partner';

export type AuditEventType =
  | 'vault_deposit'
  | 'vault_withdrawal'
  | 'compliance_check'
  | 'kyc_verification'
  | 'allocation_change'
  | 'reserve_rebalance'
  | 'governance_vote'
  | 'custodian_transfer'
  | 'regulatory_report'
  | 'access_granted'
  | 'access_revoked';

export type ReserveAssetClass =
  | 'sovereign_bond'
  | 'central_bank_reserve'
  | 'gold'
  | 'stablecoin'
  | 'tokenized_rwa'
  | 'institutional_crypto'
  | 'cash_equivalent';

export type SGIAEventType =
  | 'vault_created'
  | 'vault_updated'
  | 'vault_suspended'
  | 'entity_onboarded'
  | 'entity_suspended'
  | 'kyc_module_registered'
  | 'kyc_verified'
  | 'audit_record_created'
  | 'audit_report_generated'
  | 'capital_model_created'
  | 'reserve_breach_detected'
  | 'participation_registered'
  | 'participation_mode_changed'
  | 'compliance_passed'
  | 'compliance_failed';

// ============================================================================
// Sovereign Integration Framework Types
// ============================================================================

export interface InstitutionalVault {
  id: VaultId;
  name: string;
  vaultType: VaultType;
  fundClass: FundClass;
  ownerEntityId: SovereignEntityId;
  custodians: string[];
  signatories: VaultSignatory[];
  minimumSignatures: number;
  totalValueUSD: number;
  allocatedValueUSD: number;
  availableValueUSD: number;
  assets: VaultAsset[];
  jurisdictions: JurisdictionCode[];
  permissionedAddresses: string[];
  accessControlPolicy: AccessControlPolicy;
  status: 'active' | 'frozen' | 'pending_review' | 'suspended' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export interface VaultSignatory {
  id: string;
  role: 'primary' | 'co_signer' | 'emergency' | 'auditor';
  institutionId: string;
  publicKey: string;
  weight: number; // Voting weight for multi-sig
  addedAt: Date;
}

export interface VaultAsset {
  assetId: string;
  assetName: string;
  assetClass: ReserveAssetClass;
  chain: string;
  amount: number;
  usdValue: number;
  custodian?: string;
  verifiedAt?: Date;
}

export interface AccessControlPolicy {
  requireKyc: boolean;
  minimumKycTier: KycAmlTier;
  allowedEntityTypes: SovereignEntityType[];
  allowedJurisdictions: JurisdictionCode[];
  requireRegulatoryApproval: boolean;
  allowDelegatedAccess: boolean;
  auditTrailRequired: boolean;
}

export interface PermissionedFundClass {
  id: string;
  name: string;
  fundClass: FundClass;
  description: string;
  eligibilityCriteria: EligibilityCriteria;
  minimumInvestmentUSD: number;
  maximumInvestmentUSD?: number;
  lockupPeriodDays: number;
  redemptionNoticeDays: number;
  allowedJurisdictions: JurisdictionCode[];
  excludedJurisdictions: JurisdictionCode[];
  regulatoryApprovals: string[];
  status: 'active' | 'closed' | 'restricted';
  createdAt: Date;
}

export interface EligibilityCriteria {
  minimumAUMUSD?: number;
  requiredEntityTypes: SovereignEntityType[];
  requiredKycTier: KycAmlTier;
  requiresSovereignClassification: boolean;
  additionalRequirements: string[];
}

export interface SovereignIntegrationConfig {
  enableTokenizedVaults: boolean;
  enablePermissionedFundClasses: boolean;
  minimumMultiSigSignatures: number;
  requireVaultAuditTrail: boolean;
  maxVaultAllocationPercent: number;
  enableCrossJurisdictionVaults: boolean;
}

// ============================================================================
// Regulatory Compatibility Layer Types
// ============================================================================

export interface KycAmlModule {
  id: KycModuleId;
  name: string;
  jurisdiction: JurisdictionCode;
  kycTier: KycAmlTier;
  supportedEntityTypes: SovereignEntityType[];
  verificationSteps: KycVerificationStep[];
  sanctionsLists: string[];
  amlRules: AmlRule[];
  reportingThresholds: ReportingThreshold[];
  dataRetentionDays: number;
  status: 'active' | 'deprecated' | 'testing';
  createdAt: Date;
  updatedAt: Date;
}

export interface KycVerificationStep {
  stepId: string;
  stepName: string;
  required: boolean;
  documentTypes: string[];
  automationLevel: 'manual' | 'semi_automated' | 'fully_automated';
  estimatedProcessingHours: number;
}

export interface AmlRule {
  id: string;
  ruleType: 'transaction_monitoring' | 'sanctions_screening' | 'pep_check' | 'adverse_media' | 'source_of_funds';
  threshold?: number;
  currency?: string;
  enforcement: 'block' | 'review' | 'report' | 'flag';
  description: string;
  lastUpdated: Date;
}

export interface ReportingThreshold {
  reportType: 'CTR' | 'SAR' | 'regulatory_report' | 'audit_report';
  thresholdUSD?: number;
  frequency: 'transaction' | 'daily' | 'monthly' | 'quarterly' | 'annual';
  regulatorId: string;
  submissionDeadlineDays: number;
}

export interface JurisdictionDeploymentProfile {
  id: string;
  jurisdiction: JurisdictionCode;
  regulatoryFramework: string;
  complianceStatus: 'compliant' | 'restricted' | 'prohibited' | 'pending_review';
  requiredKycTier: KycAmlTier;
  supportedFundClasses: FundClass[];
  enabledFeatures: string[];
  disabledFeatures: string[];
  reportingRequirements: ReportingThreshold[];
  effectiveDate: Date;
  reviewDate: Date;
}

export interface RegulatoryCompatibilityConfig {
  enableKycAmlModules: boolean;
  enableJurisdictionAwareDeployment: boolean;
  defaultKycTier: KycAmlTier;
  enableSanctionsScreening: boolean;
  enableRealTimeAml: boolean;
  kycRefreshIntervalDays: number;
}

// ============================================================================
// Institutional Custody Alignment Types
// ============================================================================

export interface CustodianProfile {
  id: string;
  name: string;
  custodianType: 'traditional' | 'crypto_native' | 'hybrid' | 'sovereign_designated';
  jurisdiction: JurisdictionCode;
  regulatoryLicenses: string[];
  supportedAssets: string[];
  supportedChains: string[];
  segregationModel: 'full_segregation' | 'omnibus' | 'virtual_segregation' | 'sub_custody';
  insuranceCoverageUSD: number;
  apiCompatibility: CustodianApiCompatibility;
  proofOfReserveEnabled: boolean;
  auditFrequency: 'realtime' | 'daily' | 'weekly' | 'monthly';
  status: 'active' | 'onboarding' | 'suspended' | 'deregistered';
  onboardedAt: Date;
}

export interface CustodianApiCompatibility {
  protocols: string[]; // e.g., 'ISO20022', 'FIX', 'REST', 'SWIFT'
  authMethods: string[];
  reportingFormats: string[];
  settlementIntegrations: string[];
}

export interface MultiSigVaultConfig {
  id: string;
  vaultId: VaultId;
  signatoryThreshold: number; // m-of-n
  totalSignatories: number;
  signatories: VaultSignatory[];
  timelock?: number; // Seconds
  emergencyRecoveryEnabled: boolean;
  hardwareSecurityModule: boolean;
  geographicDistribution: JurisdictionCode[];
  createdAt: Date;
}

export interface CustodianTransfer {
  id: string;
  fromCustodianId: string;
  toCustodianId: string;
  vaultId: VaultId;
  assetId: string;
  amount: number;
  usdValue: number;
  initiatedBy: string;
  requiredApprovals: number;
  receivedApprovals: string[];
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled';
  initiatedAt: Date;
  completedAt?: Date;
  metadata: Record<string, unknown>;
}

export interface CustodyAlignmentConfig {
  enableMultiSigVaults: boolean;
  enableCustodianApiIntegration: boolean;
  enableProofOfReserve: boolean;
  minimumInsuranceCoverageUSD: number;
  requireLicensedCustodians: boolean;
  enableCrossJurisdictionCustody: boolean;
  auditFrequency: 'realtime' | 'daily' | 'weekly';
}

// ============================================================================
// Transparency & Audit Framework Types
// ============================================================================

export interface AuditRecord {
  id: AuditRecordId;
  eventType: AuditEventType;
  entityId: string;
  entityType: string;
  actorId: string;
  actorType: string;
  action: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  ipfsHash?: string;
  onChainTxHash?: string;
  timestamp: Date;
  jurisdiction: JurisdictionCode;
  complianceFlags: string[];
}

export interface AuditDashboard {
  id: string;
  name: string;
  entityId: string;
  reportingPeriodStart: Date;
  reportingPeriodEnd: Date;
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  complianceScore: number; // 0-100
  totalVaultValueUSD: number;
  totalTransactionVolumeUSD: number;
  flaggedEvents: number;
  resolvedFlags: number;
  pendingFlags: number;
  generatedAt: Date;
}

export interface RealTimeReport {
  id: string;
  reportType: 'vault_status' | 'compliance_summary' | 'capital_adequacy' | 'transaction_volume' | 'risk_exposure';
  entityId: string;
  data: Record<string, unknown>;
  metrics: ReportMetric[];
  alerts: ReportAlert[];
  generatedAt: Date;
  validUntil: Date;
}

export interface ReportMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  threshold?: number;
  breached: boolean;
}

export interface ReportAlert {
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  entityId?: string;
  actionRequired: boolean;
  deadline?: Date;
}

export interface TransparencyAuditConfig {
  enableOnChainAudit: boolean;
  enableRealTimeReporting: boolean;
  enableIpfsAuditLog: boolean;
  auditRetentionDays: number;
  enablePublicDashboard: boolean;
  complianceScoreThreshold: number; // Minimum acceptable score
  enableAutomatedAlerts: boolean;
}

// ============================================================================
// Capital Adequacy & Reserve Model Types
// ============================================================================

export interface CapitalAdequacyModel {
  id: CapitalModelId;
  entityId: SovereignEntityId;
  entityName: string;
  modelType: 'basel3' | 'sovereign_grade' | 'custom';
  totalCapitalUSD: number;
  tier1CapitalUSD: number;
  tier2CapitalUSD: number;
  riskWeightedAssetsUSD: number;
  capitalAdequacyRatio: number; // CAR = Capital / RWA
  tier1Ratio: number;
  leverageRatio: number;
  liquidityCoverageRatio: number;
  netStableFundingRatio: number;
  minimumCARRequired: number;
  bufferCapitalUSD: number;
  status: 'compliant' | 'warning' | 'breach' | 'under_review';
  calculatedAt: Date;
  nextReviewAt: Date;
}

export interface ReserveRequirement {
  id: string;
  entityId: SovereignEntityId;
  requirementType: 'liquidity_buffer' | 'capital_buffer' | 'reserve_ratio' | 'collateral_requirement';
  minimumRatioPercent: number;
  currentRatioPercent: number;
  minimumAmountUSD: number;
  currentAmountUSD: number;
  assetClasses: ReserveAssetClass[];
  isBreached: boolean;
  breachSeverity?: 'minor' | 'moderate' | 'severe' | 'critical';
  enforced: boolean;
  reviewFrequency: 'daily' | 'weekly' | 'monthly';
  lastCheckedAt: Date;
}

export interface LiquidityBuffer {
  id: string;
  entityId: SovereignEntityId;
  bufferSizeUSD: number;
  usedUSD: number;
  availableUSD: number;
  utilizationRate: number; // 0-1
  highQualityLiquidAssets: BufferAsset[];
  stressTestResult?: LiquidityStressResult;
  lastUpdatedAt: Date;
}

export interface BufferAsset {
  assetId: string;
  assetName: string;
  assetClass: ReserveAssetClass;
  amount: number;
  usdValue: number;
  haircut: number; // % discount for stress scenarios
  liquidityScore: number; // 0-100
}

export interface LiquidityStressResult {
  scenario: string;
  stressedValueUSD: number;
  survivalDays: number;
  passed: boolean;
  deficitUSD?: number;
  simulatedAt: Date;
}

export interface CapitalAdequacyConfig {
  enableCapitalAdequacyModeling: boolean;
  enableReserveRequirements: boolean;
  enableLiquidityBuffers: boolean;
  minimumCARPercent: number;
  minimumLiquidityBufferPercent: number;
  enableStressTests: boolean;
  stressTestFrequency: 'daily' | 'weekly' | 'monthly';
  breachAutoAction: 'alert' | 'restrict' | 'freeze';
}

// ============================================================================
// Sovereign Participation Modes Types
// ============================================================================

export interface ParticipationProfile {
  id: ParticipationId;
  entityId: SovereignEntityId;
  entityName: string;
  entityType: SovereignEntityType;
  participationMode: ParticipationMode;
  privileges: ParticipationPrivilege[];
  restrictions: ParticipationRestriction[];
  allocations: ParticipationAllocation[];
  governanceRights: GovernanceRights;
  agreementIds: string[];
  status: 'active' | 'suspended' | 'pending_approval' | 'terminated';
  registeredAt: Date;
  lastReviewAt: Date;
  nextReviewAt: Date;
}

export interface ParticipationPrivilege {
  privilegeType: 'read_only' | 'allocate' | 'govern' | 'audit' | 'custody' | 'emergency_action';
  scope: string[];
  grantedAt: Date;
  expiresAt?: Date;
}

export interface ParticipationRestriction {
  restrictionType: 'jurisdiction_limit' | 'position_limit' | 'transaction_limit' | 'asset_class_restriction';
  description: string;
  value?: number;
  currency?: string;
  enforced: boolean;
}

export interface ParticipationAllocation {
  assetClass: string;
  targetPercent: number;
  currentPercent: number;
  minimumPercent: number;
  maximumPercent: number;
  currentValueUSD: number;
}

export interface GovernanceRights {
  canVote: boolean;
  votingWeight: number; // 0-100
  canPropose: boolean;
  proposalCategories: string[];
  canVeto: boolean;
  vetoScope: string[];
}

export interface SovereignParticipationConfig {
  enableObserverMode: boolean;
  enableAllocatorMode: boolean;
  enableStrategicPartnerMode: boolean;
  enableRegulatoryNodeMode: boolean;
  enableCustodianPartnerMode: boolean;
  requireGovernanceApprovalForUpgrade: boolean;
  participationReviewIntervalDays: number;
}

// ============================================================================
// SGIA System-Level Types
// ============================================================================

export interface SGIASystemStatus {
  // Sovereign Integration
  totalRegisteredEntities: number;
  activeVaults: number;
  totalVaultValueUSD: number;
  permissionedFundClasses: number;
  // Regulatory Compatibility
  activeKycModules: number;
  verifiedEntities: number;
  activeJurisdictionProfiles: number;
  pendingKycReviews: number;
  // Custody Alignment
  activeCustodians: number;
  multiSigVaults: number;
  pendingCustodianTransfers: number;
  // Transparency & Audit
  totalAuditRecords: number;
  activeAuditDashboards: number;
  openAuditAlerts: number;
  // Capital Adequacy
  totalCapitalModels: number;
  capitalAdequacyBreaches: number;
  reserveRequirementBreaches: number;
  // Sovereign Participation
  activeParticipants: number;
  observerCount: number;
  allocatorCount: number;
  strategicPartnerCount: number;
  generatedAt: Date;
}

export interface SGIAConfig {
  sovereignIntegration?: Partial<SovereignIntegrationConfig>;
  regulatoryCompatibility?: Partial<RegulatoryCompatibilityConfig>;
  custodyAlignment?: Partial<CustodyAlignmentConfig>;
  transparencyAudit?: Partial<TransparencyAuditConfig>;
  capitalAdequacy?: Partial<CapitalAdequacyConfig>;
  sovereignParticipation?: Partial<SovereignParticipationConfig>;
}

// ============================================================================
// Event Types
// ============================================================================

export interface SGIAEvent {
  id: string;
  type: SGIAEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export type SGIAEventCallback = (event: SGIAEvent) => void;
