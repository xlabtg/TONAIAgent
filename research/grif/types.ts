/**
 * TONAIAgent - Global Regulatory Integration Framework (GRIF)
 * Type Definitions
 *
 * Comprehensive types for the GRIF module covering:
 * - Jurisdiction-aware deployment
 * - Compliance module interfaces
 * - Regulatory transparency portal
 * - Audit & attestation layer
 * - Structured regulatory dialogue
 */

// ============================================================================
// Core Enums & Union Types
// ============================================================================

export type GRIFRegionCode = 'EU' | 'US' | 'MENA' | 'APAC' | 'LatAm' | 'Africa' | 'Global';

export type GRIFJurisdictionCode =
  // Europe
  | 'CH' | 'DE' | 'FR' | 'NL' | 'IE' | 'LU' | 'MT' | 'EE' | 'LI'
  // Americas
  | 'US' | 'CA' | 'BM' | 'KY'
  // Middle East & Africa
  | 'AE' | 'BH' | 'SA' | 'QA'
  // Asia-Pacific
  | 'SG' | 'HK' | 'JP' | 'AU' | 'KR'
  // UK
  | 'GB';

export type ComplianceRuleType =
  | 'securities_classification'
  | 'custody_requirement'
  | 'capital_reserve'
  | 'reporting_obligation'
  | 'kyc_aml'
  | 'investor_restriction'
  | 'asset_restriction';

export type ParticipantType =
  | 'retail'
  | 'accredited_investor'
  | 'professional'
  | 'institutional'
  | 'sovereign';

export type FundClassType =
  | 'public'
  | 'rwa_only'
  | 'accredited_investor'
  | 'institutional'
  | 'sovereign';

export type ComplianceModuleStatus = 'active' | 'inactive' | 'pending' | 'deprecated';

export type AttestationType =
  | 'proof_of_reserve'
  | 'compliance_attestation'
  | 'risk_attestation'
  | 'audit_attestation'
  | 'zero_knowledge';

export type DialogueType =
  | 'whitepaper_disclosure'
  | 'risk_report'
  | 'governance_transparency'
  | 'institutional_presentation'
  | 'regulatory_inquiry';

export type RegulatoryStatus =
  | 'compliant'
  | 'partial'
  | 'under_review'
  | 'non_compliant'
  | 'exempt';

export type GRIFRiskLevel = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// Jurisdiction-Aware Deployment Layer
// ============================================================================

export interface RegionComplianceRule {
  id: string;
  ruleType: ComplianceRuleType;
  jurisdiction: GRIFJurisdictionCode;
  region: GRIFRegionCode;
  description: string;
  requiredDocuments?: string[];
  thresholds?: Record<string, number>;
  effective: Date;
  lastUpdated: Date;
}

export interface FundClass {
  id: string;
  name: string;
  type: FundClassType;
  eligibleJurisdictions: GRIFJurisdictionCode[];
  participantRequirements: ParticipantRequirement[];
  assetRestrictions: string[];
  minimumInvestment?: number;
  currency?: string;
  active: boolean;
  createdAt: Date;
}

export interface ParticipantRequirement {
  type: ParticipantType;
  kycTier: 'basic' | 'enhanced' | 'institutional';
  additionalChecks: string[];
}

export interface PermissionedPool {
  id: string;
  name: string;
  fundClassId: string;
  jurisdiction: GRIFJurisdictionCode;
  allowedParticipantTypes: ParticipantType[];
  tvl: number;
  currency: string;
  status: 'open' | 'closed' | 'restricted';
  complianceModuleIds: string[];
  createdAt: Date;
}

export interface DeploymentRegionConfig {
  jurisdiction: GRIFJurisdictionCode;
  region: GRIFRegionCode;
  enabled: boolean;
  complianceRules: RegionComplianceRule[];
  fundClasses: FundClass[];
  pools: PermissionedPool[];
  restrictedActivities: string[];
  reportingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

// ============================================================================
// Regulatory Mapping Matrix
// ============================================================================

export interface RegulatoryMapping {
  jurisdiction: GRIFJurisdictionCode;
  region: GRIFRegionCode;
  securitiesClassification: SecuritiesClassification;
  custodyRequirements: CustodyRequirement;
  capitalReserveStandards: CapitalReserveStandard;
  reportingObligations: ReportingObligation[];
  kycAmlObligations: KycAmlObligation;
  lastUpdated: Date;
}

export interface SecuritiesClassification {
  digitalAssetsAs: 'securities' | 'commodities' | 'currency' | 'utility' | 'unclassified';
  tokenizedRWA: 'regulated' | 'unregulated' | 'pending';
  applicableRegulations: string[];
}

export interface CustodyRequirement {
  requiresLicensedCustodian: boolean;
  selfCustodyAllowed: boolean;
  segregationRequired: boolean;
  insuranceRequired: boolean;
  minimumCapital?: number;
  approvedCustodianTypes: string[];
}

export interface CapitalReserveStandard {
  minimumReserveRatio: number;
  liquidityBufferPercent: number;
  stressTestFrequency: 'monthly' | 'quarterly' | 'annually';
  regulatoryFramework: string;
}

export interface ReportingObligation {
  type: string;
  frequency: 'real_time' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  regulator: string;
  format?: string;
  thresholdAmount?: number;
}

export interface KycAmlObligation {
  kycTierRequired: 'basic' | 'enhanced' | 'institutional';
  amlScreeningRequired: boolean;
  sanctionsScreeningRequired: boolean;
  pepScreeningRequired: boolean;
  uboDisclosureRequired: boolean;
  transactionMonitoringRequired: boolean;
  sarFilingRequired: boolean;
  recordRetentionYears: number;
}

// ============================================================================
// Compliance Module Interface
// ============================================================================

export interface ComplianceModule {
  id: string;
  name: string;
  version: string;
  status: ComplianceModuleStatus;
  supportedJurisdictions: GRIFJurisdictionCode[];
  capabilities: ComplianceCapability[];
  createdAt: Date;
  updatedAt: Date;
}

export type ComplianceCapability =
  | 'kyc_verification'
  | 'aml_screening'
  | 'custodian_hook'
  | 'rwa_compliance'
  | 'institutional_reporting'
  | 'sanctions_screening'
  | 'investor_accreditation'
  | 'asset_restriction'
  | 'transaction_monitoring';

export interface ParticipantVerificationResult {
  participantId: string;
  verified: boolean;
  tier: ParticipantType;
  checks: VerificationCheck[];
  expiresAt?: Date;
  verifiedAt: Date;
}

export interface VerificationCheck {
  name: string;
  passed: boolean;
  details?: string;
}

export interface AssetValidationResult {
  assetId: string;
  assetType: string;
  valid: boolean;
  jurisdictions: GRIFJurisdictionCode[];
  restrictions: string[];
  validatedAt: Date;
}

export interface RestrictionEnforcementResult {
  allowed: boolean;
  reasons: string[];
  appliedRules: string[];
  checkedAt: Date;
}

export interface RegulatoryReport {
  id: string;
  moduleId: string;
  reportType: string;
  jurisdiction: GRIFJurisdictionCode;
  periodStart: Date;
  periodEnd: Date;
  data: Record<string, unknown>;
  generatedAt: Date;
  format: 'json' | 'xml' | 'csv' | 'pdf';
}

// ============================================================================
// Regulatory Transparency Portal
// ============================================================================

export interface StabilityIndexSnapshot {
  timestamp: Date;
  overallScore: number;
  components: Record<string, number>;
  trend: 'improving' | 'stable' | 'declining';
}

export interface CapitalAdequacyMetric {
  timestamp: Date;
  tier1Ratio: number;
  tier2Ratio: number;
  totalCapitalRatio: number;
  leverageRatio: number;
  liquidityCoverageRatio: number;
  netStableFundingRatio: number;
  status: 'adequate' | 'borderline' | 'inadequate';
}

export interface TreasuryReserveSnapshot {
  timestamp: Date;
  totalReserves: number;
  currency: string;
  composition: ReserveComposition[];
  proofOfReserveHash?: string;
  lastAuditedAt?: Date;
}

export interface ReserveComposition {
  assetType: string;
  amount: number;
  percentage: number;
  chain?: string;
}

export interface ClearingStatistics {
  timestamp: Date;
  totalTransactions: number;
  totalVolume: number;
  currency: string;
  averageSettlementTimeMinutes: number;
  successRate: number;
  jurisdictionBreakdown: Record<string, number>;
}

export interface TransparencyPortalData {
  stabilityIndex: StabilityIndexSnapshot;
  capitalAdequacy: CapitalAdequacyMetric;
  treasuryReserves: TreasuryReserveSnapshot;
  clearingStatistics: ClearingStatistics;
  lastRefreshed: Date;
}

// ============================================================================
// Audit & Attestation Layer
// ============================================================================

export interface AuditRecord {
  id: string;
  auditType: string;
  auditor: string;
  scope: string[];
  jurisdiction?: GRIFJurisdictionCode;
  startDate: Date;
  endDate?: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
  findings: AuditFinding[];
  reportUrl?: string;
  completedAt?: Date;
  createdAt: Date;
}

export interface AuditFinding {
  severity: GRIFRiskLevel;
  category: string;
  description: string;
  remediation?: string;
  resolved: boolean;
}

export interface Attestation {
  id: string;
  type: AttestationType;
  issuer: string;
  subject: string;
  jurisdiction?: GRIFJurisdictionCode;
  data: Record<string, unknown>;
  proofHash: string;
  issuedAt: Date;
  expiresAt?: Date;
  zkProof?: string;
  verified: boolean;
}

export interface ProofOfReserveAttestation extends Attestation {
  type: 'proof_of_reserve';
  reserveAmount: number;
  currency: string;
  merkleRoot: string;
  blockHeight?: number;
  chain?: string;
}

export interface RiskAttestation extends Attestation {
  type: 'risk_attestation';
  riskScore: number;
  riskLevel: GRIFRiskLevel;
  riskFactors: string[];
  assessmentMethodology: string;
}

export interface ComplianceAttestation extends Attestation {
  type: 'compliance_attestation';
  complianceFramework: string;
  regulatoryStatus: RegulatoryStatus;
  coveredJurisdictions: GRIFJurisdictionCode[];
  complianceScore: number;
}

// ============================================================================
// Structured Regulatory Dialogue Framework
// ============================================================================

export interface RegulatoryDocument {
  id: string;
  type: DialogueType;
  title: string;
  version: string;
  targetAudience: ('regulators' | 'institutions' | 'public')[];
  jurisdiction?: GRIFJurisdictionCode;
  content: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegulatorEngagement {
  id: string;
  regulatorName: string;
  jurisdiction: GRIFJurisdictionCode;
  engagementType: 'inquiry' | 'consultation' | 'audit' | 'registration' | 'dialogue';
  status: 'pending' | 'active' | 'resolved' | 'closed';
  description: string;
  documents: string[];
  startedAt: Date;
  resolvedAt?: Date;
  notes?: string;
}

// ============================================================================
// GRIF Manager Config & Events
// ============================================================================

export interface GRIFConfig {
  enabled?: boolean;
  primaryJurisdiction?: GRIFJurisdictionCode;
  operationalRegions?: GRIFRegionCode[];
  complianceLevel?: 'basic' | 'standard' | 'enhanced' | 'institutional';
  transparencyPortal?: {
    enabled?: boolean;
    refreshIntervalMinutes?: number;
    publicAccess?: boolean;
  };
  auditLayer?: {
    enabled?: boolean;
    autoSchedule?: boolean;
    retentionYears?: number;
  };
  dialogueFramework?: {
    enabled?: boolean;
    autoPublish?: boolean;
  };
}

export interface GRIFStatusReport {
  overall: RegulatoryStatus;
  score: number;
  lastAssessed: Date;
  nextReviewDue: Date;
  activeModules: number;
  enabledJurisdictions: GRIFJurisdictionCode[];
  pendingAttestations: number;
  openEngagements: number;
  riskLevel: GRIFRiskLevel;
}

export type GRIFEventType =
  | 'participant_verified'
  | 'asset_validated'
  | 'restriction_enforced'
  | 'report_generated'
  | 'attestation_issued'
  | 'audit_completed'
  | 'engagement_updated'
  | 'module_status_changed'
  | 'compliance_alert';

export interface GRIFEvent {
  type: GRIFEventType;
  timestamp: Date;
  data: Record<string, unknown>;
}

export type GRIFEventCallback = (event: GRIFEvent) => void;
