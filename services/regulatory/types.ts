/**
 * TONAIAgent Regulatory Strategy - Type Definitions
 * Comprehensive types for global regulatory compliance, jurisdiction analysis,
 * KYC/AML frameworks, AI governance, and cross-border operations.
 */

// ============================================================================
// Core Types
// ============================================================================

export type RegionCode = 'EU' | 'APAC' | 'MENA' | 'Americas' | 'Africa' | 'Oceania';

export type JurisdictionCode =
  | 'CH' | 'LI' | 'EE' | 'MT' | 'LU' | 'IE' | 'DE' | 'FR' | 'NL' // Europe
  | 'SG' | 'HK' | 'JP' | 'KR' | 'AU' | 'NZ' // Asia-Pacific
  | 'AE' | 'BH' | 'SA' | 'QA' // Middle East
  | 'US' | 'CA' | 'BM' | 'KY' | 'VG' | 'BS' // Americas/Offshore
  | 'GB' | 'GI' | 'JE' | 'GG'; // UK & Crown Dependencies

export type EntityType =
  | 'AG' | 'GmbH' | 'SA' | 'SAS' | 'BV' | 'LLC' | 'LLP' | 'LP'
  | 'PTE_LTD' | 'PLC' | 'DAC' | 'OU' | 'Foundation' | 'Association';

export type ComplianceLevel = 'basic' | 'standard' | 'enhanced' | 'institutional';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ComplianceStatus = 'compliant' | 'partial' | 'non_compliant' | 'pending' | 'expired';

// ============================================================================
// Jurisdiction Analysis Types
// ============================================================================

export interface JurisdictionAnalysis {
  jurisdiction: JurisdictionCode;
  regulatoryScore: number;
  cryptoFriendlinessScore: number;
  institutionalAccessScore: number;
  taxEfficiencyScore: number;
  bankingAccessScore: number;
  operationalCostScore: number;
  totalScore: number;
  requiredLicenses: LicenseRequirement[];
  estimatedTimeline: TimelineEstimate;
  estimatedCosts: CostEstimate;
  taxFramework: TaxFramework;
  risks: JurisdictionRisk[];
  recommendations: string[];
}

export interface LicenseRequirement {
  type: string;
  name: string;
  regulator: string;
  description: string;
  requiredFor: string[];
  estimatedTimeline: string;
  estimatedCost: number;
  capitalRequirement?: number;
  renewalPeriod?: string;
  prerequisites: string[];
}

export interface TimelineEstimate {
  entitySetup: string;
  licenseApplication: string;
  licenseApproval: string;
  operationalReadiness: string;
  totalEstimate: string;
}

export interface CostEstimate {
  entitySetup: number;
  legalFees: number;
  licenseFees: number;
  capitalRequirements: number;
  ongoingAnnual: number;
  currency: string;
}

export interface TaxFramework {
  corporateTaxRate: number;
  capitalGainsTax: number;
  vatApplicable: boolean;
  vatRate?: number;
  cryptoTaxTreatment: string;
  taxTreaties: string[];
  holdingBenefits: string[];
}

export interface JurisdictionRisk {
  category: string;
  level: RiskLevel;
  description: string;
  mitigations: string[];
}

export interface JurisdictionComparison {
  jurisdictions: JurisdictionCode[];
  rankings: JurisdictionRanking[];
  recommendations: string[];
  optimalChoice: JurisdictionCode;
  rationale: string;
}

export interface JurisdictionRanking {
  jurisdiction: JurisdictionCode;
  totalScore: number;
  scores: {
    regulatoryClarity: number;
    cryptoFriendliness: number;
    institutionalAccess: number;
    taxEfficiency: number;
    operationalCost: number;
    bankingAccess: number;
  };
  strengths: string[];
  weaknesses: string[];
}

// ============================================================================
// Entity Architecture Types
// ============================================================================

export interface EntityArchitecture {
  primaryHQ: EntityConfig;
  operationalHubs: EntityConfig[];
  techSubsidiary?: EntityConfig;
  holdingStructure?: HoldingStructure;
  totalEstimatedCost: number;
  timeline: string;
  taxOptimization: TaxOptimization;
  recommendations: string[];
}

export interface EntityConfig {
  jurisdiction: JurisdictionCode;
  entityType: EntityType;
  purpose: string;
  activities: string[];
  capitalRequirement?: number;
  licenses?: string[];
  estimatedSetupCost: number;
  estimatedAnnualCost: number;
}

export interface HoldingStructure {
  type: 'simple' | 'layered' | 'hybrid';
  entities: EntityRelationship[];
  ipOwnership: JurisdictionCode;
  profitAllocation: ProfitAllocation;
}

export interface EntityRelationship {
  parent: string;
  subsidiary: string;
  ownershipPercent: number;
  purpose: string;
}

export interface ProfitAllocation {
  strategy: string;
  transferPricingCompliant: boolean;
  substanceRequirements: string[];
}

export interface TaxOptimization {
  effectiveTaxRate: number;
  strategies: string[];
  risks: string[];
  compliance: string[];
}

// ============================================================================
// Regulatory Positioning Types
// ============================================================================

export type PlatformClassification =
  | 'software_infrastructure'
  | 'ai_agent_platform'
  | 'non_custodial_automation'
  | 'asset_management_technology'
  | 'vasp_casp'
  | 'payment_service_provider'
  | 'investment_advisor';

export interface ClassificationAnalysis {
  options: ClassificationOption[];
  recommendedClassification: PlatformClassification;
  riskAssessment: RiskAssessment;
  touchpoints: RegulatoryTouchpoint[];
  implementationSteps: string[];
}

export interface ClassificationOption {
  classification: PlatformClassification;
  description: string;
  regulatoryBurden: 'minimal' | 'low' | 'medium' | 'high' | 'very_high';
  applicableFrameworks: string[];
  requiredLicenses: string[];
  limitations: string[];
  benefits: string[];
  suitability: number; // 0-100
}

export interface RiskAssessment {
  overallRisk: RiskLevel;
  categories: RiskCategory[];
  mitigations: RiskMitigation[];
}

export interface RiskCategory {
  name: string;
  level: RiskLevel;
  description: string;
  probability: number;
  impact: number;
}

export interface RiskMitigation {
  risk: string;
  strategy: string;
  effectiveness: number;
  cost: number;
  timeline: string;
}

export interface RegulatoryTouchpoint {
  activity: string;
  regulations: string[];
  jurisdictions: JurisdictionCode[];
  complianceRequirements: string[];
}

// ============================================================================
// Custodial Compliance Types
// ============================================================================

export type CustodyModel = 'non_custodial' | 'mpc' | 'smart_contract' | 'full_custody';

export interface CustodyModelAnalysis {
  model: CustodyModel;
  classification: CustodyClassification;
  jurisdictionAnalysis: JurisdictionCustodyAnalysis[];
  licensingImpact: LicensingImpact;
  riskMitigation: CustodyRiskMitigation[];
  recommendations: string[];
}

export interface CustodyClassification {
  category: string;
  userControl: 'full' | 'shared' | 'rule_based' | 'none';
  keyOwnership: string;
  regulatoryStatus: string;
  liabilityAllocation: LiabilityAllocation;
}

export interface JurisdictionCustodyAnalysis {
  jurisdiction: JurisdictionCode;
  classification: string;
  licensingRequired: boolean;
  licenses: string[];
  restrictions: string[];
  notes: string;
}

export interface LicensingImpact {
  additionalLicenses: string[];
  exemptions: string[];
  reducedRequirements: string[];
  complianceChanges: string[];
}

export interface LiabilityAllocation {
  platformResponsibility: string[];
  userResponsibility: string[];
  sharedResponsibility: string[];
}

export interface CustodyRiskMitigation {
  risk: string;
  mitigation: string;
  documentation: string[];
}

export interface ControlFramework {
  model: CustodyModel;
  controlMatrix: ControlMatrix;
  liabilityAllocation: LiabilityAllocation;
  requiredDocumentation: string[];
  operationalProcedures: string[];
}

export interface ControlMatrix {
  keyGeneration: string;
  signing: string;
  recovery: string;
  revocation: string;
  access: string;
}

// ============================================================================
// KYC/AML Framework Types
// ============================================================================

export type KycTier = 'basic' | 'standard' | 'enhanced' | 'institutional';

export type DocumentType =
  | 'passport' | 'national_id' | 'drivers_license' | 'residence_permit'
  | 'utility_bill' | 'bank_statement' | 'tax_return'
  | 'articles_of_incorporation' | 'certificate_of_good_standing'
  | 'board_resolution' | 'shareholder_register' | 'financial_statements'
  | 'aml_policy' | 'regulatory_license';

export type ScreeningType = 'sanctions' | 'pep' | 'adverse_media' | 'watchlist';

export type AlertStatus = 'open' | 'investigating' | 'escalated' | 'resolved' | 'false_positive';

export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';

export interface KycTierConfig {
  name: KycTier;
  requirements: KycRequirements;
  limits: TransactionLimits;
  applicableTo: string[];
  riskThreshold: number;
}

export interface KycRequirements {
  emailVerification: boolean;
  phoneVerification: boolean;
  identityDocument: boolean;
  addressVerification: boolean;
  sourceOfFunds: boolean;
  sourceOfWealth?: boolean;
  sanctionsCheck: boolean;
  pepCheck?: boolean;
  adverseMediaCheck?: boolean;
  ongoingMonitoring?: boolean;
  entityVerification?: boolean;
  beneficialOwnership?: boolean;
  directorVerification?: boolean;
  companyDocuments?: boolean;
  financialStatements?: boolean;
  amlPolicy?: boolean;
  regulatoryStatus?: boolean;
  enhancedDueDiligence?: boolean;
}

export interface TransactionLimits {
  dailyTransaction: number | 'unlimited';
  monthlyTransaction: number | 'unlimited';
  singleTransaction: number | 'unlimited';
  currency?: string;
}

export interface KycApplication {
  userId: string;
  requestedTier: KycTier;
  documents: KycDocument[];
  personalInfo?: PersonalInfo;
  entityInfo?: EntityInfo;
  submittedAt: Date;
}

export interface KycDocument {
  type: DocumentType;
  documentId: string;
  issuingCountry: string;
  expiryDate?: Date;
  issueDate?: Date;
  verified?: boolean;
  verificationResult?: DocumentVerificationResult;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  nationality: string;
  residenceCountry: string;
  address: Address;
  taxId?: string;
  occupation?: string;
  employerName?: string;
}

export interface EntityInfo {
  legalName: string;
  tradingName?: string;
  jurisdiction: string;
  entityType: string;
  registrationNumber: string;
  incorporationDate: Date;
  registeredAddress: Address;
  operationalAddress?: Address;
  website?: string;
  industry?: string;
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface DocumentVerificationResult {
  verified: boolean;
  confidence: number;
  checks: DocumentCheck[];
  issues: string[];
}

export interface DocumentCheck {
  type: string;
  passed: boolean;
  details: string;
}

export interface KycResult {
  applicationId: string;
  userId: string;
  status: 'approved' | 'pending' | 'rejected' | 'additional_info_required';
  requestedTier: KycTier;
  approvedTier?: KycTier;
  riskScore: number;
  riskLevel: RiskLevel;
  screeningResults: ScreeningResults;
  pendingDocuments?: DocumentType[];
  rejectionReasons?: string[];
  expiryDate?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface ScreeningResults {
  sanctions: ScreeningResult;
  pep: ScreeningResult;
  adverseMedia: ScreeningResult;
  watchlist: ScreeningResult;
  overallRisk: RiskLevel;
}

export interface ScreeningResult {
  screened: boolean;
  hit: boolean;
  matches: ScreeningMatch[];
  riskLevel: RiskLevel;
  lastScreened: Date;
}

export interface ScreeningMatch {
  source: string;
  matchType: string;
  matchScore: number;
  entityName: string;
  details: Record<string, unknown>;
}

// ============================================================================
// Transaction Monitoring Types
// ============================================================================

export interface TransactionMonitoringConfig {
  enabled: boolean;
  rules: MonitoringRule[];
  sanctionsScreening: SanctionsScreeningConfig;
  alerting: AlertingConfig;
}

export interface MonitoringRule {
  id: string;
  name: string;
  condition: RuleCondition;
  action: 'allow' | 'flag_review' | 'manual_approval' | 'block' | 'alert';
  priority: AlertPriority;
  enabled: boolean;
}

export interface RuleCondition {
  amount?: NumberCondition;
  frequency?: FrequencyCondition;
  destination?: DestinationCondition;
  pattern?: string;
  and?: RuleCondition[];
  or?: RuleCondition[];
}

export interface NumberCondition {
  eq?: number;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
}

export interface FrequencyCondition {
  within: string;
  count: NumberCondition;
}

export interface DestinationCondition {
  in?: string | string[];
  notIn?: string[];
  firstSeen?: string;
}

export interface SanctionsScreeningConfig {
  realTime: boolean;
  providers: string[];
  includeSecondaryScreening: boolean;
  lists: string[];
}

export interface AlertingConfig {
  enabled: boolean;
  channels: string[];
  escalation: EscalationConfig;
}

export interface EscalationConfig {
  enabled: boolean;
  levels: EscalationLevel[];
  timeoutMinutes: number;
}

export interface EscalationLevel {
  level: number;
  roles: string[];
  timeoutMinutes: number;
}

export interface TransactionCheck {
  transactionId: string;
  userId: string;
  type: string;
  amount: number;
  currency: string;
  source?: string;
  destination: string;
  timestamp?: Date;
}

export interface TransactionCheckResult {
  transactionId: string;
  approved: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  flags: TransactionFlag[];
  matchedRules: string[];
  requiredActions: string[];
  alerts?: AmlAlert[];
  reviewRequired: boolean;
}

export interface TransactionFlag {
  type: string;
  description: string;
  severity: AlertPriority;
  details: Record<string, unknown>;
}

export interface AmlAlert {
  id: string;
  type: string;
  priority: AlertPriority;
  status: AlertStatus;
  userId: string;
  transactionIds: string[];
  description: string;
  riskScore: number;
  createdAt: Date;
  assignedTo?: string;
  resolvedAt?: Date;
  resolution?: string;
}

export interface AddressScreeningResult {
  address: string;
  sanctionsHit: boolean;
  riskCategory: RiskLevel;
  associatedEntities: string[];
  riskIndicators: string[];
  recommendations: string[];
  lastUpdated: Date;
}

export interface UserScreeningResult {
  pepStatus: PepStatus;
  sanctionsMatch: SanctionsMatchResult;
  adverseMedia: AdverseMediaResult;
  overallRisk: RiskLevel;
  recommendations: string[];
}

export interface PepStatus {
  isPep: boolean;
  pepType?: string;
  position?: string;
  country?: string;
  riskLevel: RiskLevel;
}

export interface SanctionsMatchResult {
  hasMatch: boolean;
  matches: SanctionsMatch[];
  sources: string[];
}

export interface SanctionsMatch {
  listName: string;
  entityName: string;
  matchScore: number;
  listingDate?: Date;
  reason?: string;
}

export interface AdverseMediaResult {
  hasAdverseMedia: boolean;
  articles: MediaArticle[];
  riskLevel: RiskLevel;
}

export interface MediaArticle {
  title: string;
  source: string;
  date: Date;
  summary: string;
  riskCategory: string;
}

// ============================================================================
// Institutional Compliance Types
// ============================================================================

export type InstitutionalEntityType =
  | 'hedge_fund' | 'family_office' | 'corporate_treasury'
  | 'bank' | 'custodian' | 'pension_fund' | 'dao_treasury'
  | 'asset_manager' | 'broker_dealer' | 'insurance_company';

export interface InstitutionalOnboarding {
  institutionId: string;
  entityInfo: InstitutionalEntityInfo;
  regulatoryStatus: RegulatoryStatus;
  beneficialOwners: BeneficialOwner[];
  authorizedSignatories: AuthorizedSignatory[];
  amlCompliance: AmlComplianceInfo;
  investmentProfile: InvestmentProfile;
  status: OnboardingStatus;
  dueDiligenceScore: number;
  pendingDocuments: string[];
  approvalStatus: ApprovalStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface InstitutionalEntityInfo {
  legalName: string;
  jurisdiction: string;
  entityType: InstitutionalEntityType;
  registrationNumber: string;
  incorporationDate: Date;
  registeredAddress: Address;
  operationalAddress?: Address;
}

export interface RegulatoryStatus {
  registrations: RegulatoryRegistration[];
  exemptions: RegulatoryExemption[];
  licenses: string[];
}

export interface RegulatoryRegistration {
  regulator: string;
  type: string;
  number: string;
  status: 'active' | 'pending' | 'expired' | 'revoked';
  expiryDate?: Date;
}

export interface RegulatoryExemption {
  type: string;
  jurisdiction: string;
  description: string;
  expiryDate?: Date;
}

export interface BeneficialOwner {
  name: string;
  ownership: number;
  nationality: string;
  role: string;
  pep: boolean;
  verified: boolean;
}

export interface AuthorizedSignatory {
  name: string;
  title: string;
  permissions: string[];
  verified: boolean;
}

export interface AmlComplianceInfo {
  hasAmlPolicy: boolean;
  amlOfficer?: string;
  lastAuditDate?: Date;
  auditFirm?: string;
  policyDocumentId?: string;
}

export interface InvestmentProfile {
  investmentObjective: string;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  expectedAum: number;
  expectedMonthlyVolume: number;
  strategies: string[];
  restrictions?: string[];
}

export type OnboardingStatus =
  | 'draft' | 'submitted' | 'under_review' | 'additional_info_required'
  | 'approved' | 'rejected' | 'suspended';

export interface ApprovalStatus {
  stage: string;
  approvers: ApproverStatus[];
  pendingApprovals: string[];
  completedAt?: Date;
}

export interface ApproverStatus {
  role: string;
  userId?: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp?: Date;
  comments?: string;
}

// ============================================================================
// AI Governance Types
// ============================================================================

export type AiRiskClass = 'minimal' | 'limited' | 'high' | 'unacceptable';

export type ExplainabilityLevel = 'minimal' | 'basic' | 'detailed' | 'comprehensive';

export type HumanOversightLevel = 'minimal' | 'meaningful' | 'full';

export interface AiSystemClassification {
  systemName: string;
  euAiActClass: AiRiskClass;
  riskLevel: RiskLevel;
  requiredControls: string[];
  documentation: string[];
  assessmentDate: Date;
  nextReviewDate: Date;
}

export interface AiModelRegistration {
  modelId: string;
  version: string;
  type: string;
  architecture: string;
  trainingData: TrainingDataInfo;
  capabilities: Record<string, boolean>;
  limitations: ModelLimitations;
  performance: ModelPerformance;
  auditStatus: AuditStatus;
  status: 'development' | 'testing' | 'staging' | 'production' | 'deprecated';
  registeredAt: Date;
  lastUpdated: Date;
}

export interface TrainingDataInfo {
  description: string;
  dataTypes: string[];
  privacyMeasures: string[];
  biasAssessment?: string;
  dataRetention?: string;
}

export interface ModelLimitations {
  maxPositionSize?: number;
  supportedMarkets?: string[];
  excludedAssets?: string[];
  geographicRestrictions?: string[];
  otherLimitations?: string[];
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  backtestSharpe?: number;
  latencyMs?: number;
  throughput?: number;
}

export interface AuditStatus {
  lastAudit: Date;
  auditor: string;
  findings: string;
  nextAuditDue: Date;
  auditType: 'internal' | 'external';
}

export interface ExplainabilityConfig {
  modelId: string;
  level: ExplainabilityLevel;
  methods: string[];
  logging: ExplainabilityLogging;
  userFacing: UserFacingExplainability;
}

export interface ExplainabilityLogging {
  allDecisions: boolean;
  retentionDays: number;
  format: 'structured' | 'natural_language' | 'both';
}

export interface UserFacingExplainability {
  simplifiedExplanations: boolean;
  confidenceDisplay: boolean;
  alternativesShown: boolean;
}

export interface DecisionExplanation {
  decisionId: string;
  modelId: string;
  summary: string;
  keyFactors: ExplanationFactor[];
  confidence: number;
  alternatives: AlternativeAction[];
  riskAssessment: DecisionRiskAssessment;
  naturalLanguage: string;
  timestamp: Date;
}

export interface ExplanationFactor {
  factor: string;
  importance: number;
  direction: 'positive' | 'negative' | 'neutral';
  explanation: string;
}

export interface AlternativeAction {
  action: string;
  confidence: number;
  reasonNotChosen: string;
}

export interface DecisionRiskAssessment {
  level: RiskLevel;
  factors: string[];
  mitigations: string[];
}

export interface HumanOversightConfig {
  modelId: string;
  oversightLevel: HumanOversightLevel;
  triggers: OversightTrigger[];
  escalation: OversightEscalation;
  interventionLogging: InterventionLogging;
}

export interface OversightTrigger {
  condition: TriggerCondition;
  action: 'require_approval' | 'notify' | 'block_and_review';
  timeout: string;
}

export interface TriggerCondition {
  transactionAmount?: NumberCondition;
  confidence?: NumberCondition;
  riskScore?: NumberCondition;
  newStrategy?: boolean;
  newCounterparty?: boolean;
}

export interface OversightEscalation {
  enabled: boolean;
  path: string[];
  timeoutPerLevel: string;
}

export interface InterventionLogging {
  enabled: boolean;
  captureReason: boolean;
  captureOutcome: boolean;
}

export interface OversightCheckResult {
  required: boolean;
  reason?: string;
  approvers?: string[];
  timeout?: string;
  escalationPath?: string[];
}

export interface AlgorithmicAudit {
  auditId: string;
  modelId: string;
  auditType: 'internal' | 'external' | 'comprehensive';
  scope: string[];
  auditor: AuditorInfo;
  frequency: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
  scheduledDate: Date;
  completedDate?: Date;
  results?: AuditResults;
}

export interface AuditorInfo {
  type: 'internal' | 'external';
  firm?: string;
  credentials: string[];
}

export interface AuditResults {
  status: 'passed' | 'passed_with_observations' | 'failed';
  findings: AuditFinding[];
  overallRisk: RiskLevel;
  recommendations: string[];
  remediationPlan?: RemediationPlan;
}

export interface AuditFinding {
  id: string;
  category: string;
  severity: RiskLevel;
  description: string;
  evidence: string;
  recommendation: string;
}

export interface RemediationPlan {
  items: RemediationItem[];
  timeline: string;
  responsible: string;
}

export interface RemediationItem {
  findingId: string;
  action: string;
  deadline: Date;
  status: 'pending' | 'in_progress' | 'completed';
}

// ============================================================================
// Privacy Compliance Types
// ============================================================================

export type PrivacyFramework = 'gdpr' | 'ccpa' | 'lgpd' | 'pdpa' | 'pipl';

export type LawfulBasis = 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interest';

export type DataSubjectRightType = 'access' | 'rectification' | 'erasure' | 'portability' | 'objection' | 'restriction';

export interface PrivacyConfig {
  enabled: boolean;
  frameworks: PrivacyFramework[];
  defaultJurisdiction: string;
  privacyByDesign: boolean;
  dataMinimization: boolean;
  dataInventory: DataInventory;
  dataProcessing: DataProcessingConfig;
  userRights: UserRightsConfig;
  security: PrivacySecurityConfig;
}

export interface DataInventory {
  categories: DataCategory[];
}

export interface DataCategory {
  name: string;
  fields: string[];
  lawfulBasis: LawfulBasis;
  retention: string;
  encryption: string;
  pseudonymized?: boolean;
  anonymized?: boolean;
  anonymizable?: boolean;
}

export interface DataProcessingConfig {
  processors: DataProcessor[];
  crossBorderTransfers: CrossBorderTransferConfig;
}

export interface DataProcessor {
  name: string;
  location: string;
  purpose: string;
  dataTypes?: string[];
  dpaInPlace?: boolean;
}

export interface CrossBorderTransferConfig {
  mechanism: 'standard_contractual_clauses' | 'binding_corporate_rules' | 'adequacy_decision' | 'derogation';
  tiaCompleted: boolean;
  adequacyDecisions: string[];
}

export interface UserRightsConfig {
  accessRequest: RightConfig;
  rectification: RightConfig;
  erasure: ErasureConfig;
  portability: PortabilityConfig;
  objection: RightConfig;
  restriction: RightConfig;
}

export interface RightConfig {
  enabled: boolean;
  sla: string;
}

export interface ErasureConfig extends RightConfig {
  exceptions: string[];
}

export interface PortabilityConfig extends RightConfig {
  format: string;
}

export interface PrivacySecurityConfig {
  encryption: EncryptionConfig;
  accessControl: AccessControlConfig;
  incidentResponse: IncidentResponseConfig;
}

export interface EncryptionConfig {
  atRest: string;
  inTransit: string;
  keyManagement: string;
}

export interface AccessControlConfig {
  rbac: boolean;
  mfa: boolean;
  auditLogging: boolean;
}

export interface IncidentResponseConfig {
  dpoContact: string;
  notificationSla: string;
  procedureDocumented: boolean;
}

export interface DataSubjectRequest {
  requestId: string;
  requestType: DataSubjectRightType;
  subjectId: string;
  verificationMethod: string;
  requestDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  dueDate: Date;
  dataCategories?: string[];
  completedAt?: Date;
  response?: DataSubjectResponse;
}

export interface DataSubjectResponse {
  data?: Record<string, unknown>;
  deletionCertificate?: string;
  retainedDataReasons?: RetainedDataReason[];
}

export interface RetainedDataReason {
  category: string;
  reason: string;
  retentionPeriod: string;
}

export interface ConsentRecord {
  userId: string;
  consents: ConsentItem[];
  consentMechanism: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConsentItem {
  purposeId: string;
  granted: boolean;
  timestamp?: Date;
}

export interface PrivacyImpactAssessment {
  assessmentId: string;
  projectName: string;
  description: string;
  result: 'low_risk' | 'acceptable' | 'requires_mitigation' | 'high_risk';
  residualRisk: RiskLevel;
  recommendations: string[];
  approvalStatus: 'pending' | 'approved' | 'rejected';
  conductedAt: Date;
  conductedBy: string;
  nextReviewDate?: Date;
}

// ============================================================================
// Cross-Border Compliance Types
// ============================================================================

export interface CrossBorderConfig {
  enabled: boolean;
  primaryJurisdiction: JurisdictionCode;
  operationalRegions: RegionCode[];
  conflictResolution: 'strictest_applies' | 'primary_jurisdiction' | 'destination_jurisdiction';
  travelRule: TravelRuleConfig;
}

export interface TravelRuleConfig {
  enabled: boolean;
  threshold: number;
  providers: string[];
  informationSharing: TravelRuleInfoSharing;
}

export interface TravelRuleInfoSharing {
  originator: string[];
  beneficiary: string[];
}

export interface RegionalComplianceConfig {
  region: RegionCode;
  framework: RegionalFramework;
  licenses: RegionalLicense[];
  restrictions: RegionalRestrictions;
  localizations: LocalizationConfig;
}

export interface RegionalFramework {
  primary: string;
  supporting: string[];
}

export interface RegionalLicense {
  type: string;
  jurisdiction: JurisdictionCode;
  status: 'active' | 'pending' | 'expired' | 'suspended';
  expiry: Date;
  number?: string;
}

export interface RegionalRestrictions {
  restrictedCountries: string[];
  restrictedActivities: string[];
  requiredDisclosures: string[];
}

export interface LocalizationConfig {
  languages: string[];
  currencies: string[];
  taxReporting: string[];
}

export interface CrossBorderTransactionAnalysis {
  transactionId: string;
  senderJurisdiction: JurisdictionCode;
  receiverJurisdiction: JurisdictionCode;
  applicableFrameworks: string[];
  requiredDisclosures: string[];
  reportingObligations: ReportingObligation[];
  restrictions: string[];
  cleared: boolean;
  travelRuleRequired: boolean;
  notes: string[];
}

export interface ReportingObligation {
  framework: string;
  reportType: string;
  deadline: string;
  jurisdiction: JurisdictionCode;
}

export interface TravelRuleTransaction {
  transactionId: string;
  compliant: boolean;
  sharedInfo: TravelRuleSharedInfo;
  counterpartyVerified: boolean;
  timestamp: Date;
}

export interface TravelRuleSharedInfo {
  originator: OriginatorInfo;
  beneficiary: BeneficiaryInfo;
}

export interface OriginatorInfo {
  vaspId: string;
  customerName: string;
  customerAddress?: string;
  accountNumber: string;
}

export interface BeneficiaryInfo {
  vaspId: string;
  customerName?: string;
  accountNumber: string;
}

// ============================================================================
// Regulatory Risk Engine Types
// ============================================================================

export interface RegulatoryRiskConfig {
  enabled: boolean;
  aiPowered: boolean;
  realTimeMonitoring: boolean;
  alertThresholds: AlertThresholds;
  riskCategories: RiskCategoryConfig[];
  automatedActions: AutomatedAction[];
}

export interface AlertThresholds {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface RiskCategoryConfig {
  name: string;
  weight: number;
  sources: string[];
  realTime?: boolean;
  alertOnChange?: boolean;
  updateFrequency?: string;
}

export interface AutomatedAction {
  trigger: AutomatedActionTrigger;
  action: string;
  notification: string[];
}

export interface AutomatedActionTrigger {
  sanctionsRisk?: NumberCondition;
  amlRisk?: NumberCondition;
  regulatoryChange?: { jurisdiction: string };
}

export interface EntityRiskAssessment {
  entityId: string;
  entityType: string;
  overallScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  recommendations: string[];
  requiredActions: string[];
  assessedAt: Date;
  nextAssessmentDue: Date;
}

export interface RiskFactor {
  category: string;
  score: number;
  weight: number;
  indicators: string[];
  details: string;
}

export interface TransactionRiskAssessment {
  transactionId: string;
  score: number;
  riskLevel: RiskLevel;
  indicators: RiskIndicator[];
  cleared: boolean;
  requiredReviews: string[];
  assessedAt: Date;
}

export interface RiskIndicator {
  type: string;
  description: string;
  severity: RiskLevel;
  contribution: number;
}

export interface SarDetectionConfig {
  patterns: SarPattern[];
  machineLearning: MlSarConfig;
}

export interface SarPattern {
  name: string;
  description: string;
  rules: Record<string, unknown>;
  riskScore: number;
  action: 'generate_sar' | 'flag_review' | 'block_and_review' | 'alert';
}

export interface MlSarConfig {
  enabled: boolean;
  modelId: string;
  threshold: number;
  humanReviewRequired: boolean;
}

export interface SuspiciousActivityAnalysis {
  entityId: string;
  patternsDetected: DetectedPattern[];
  aggregateRiskScore: number;
  sarRequired: boolean;
  investigationNotes: string[];
  analyzedAt: Date;
}

export interface DetectedPattern {
  patternName: string;
  confidence: number;
  occurrences: number;
  timeRange: { start: Date; end: Date };
  evidence: string[];
}

export interface RegulatoryChange {
  id: string;
  name: string;
  jurisdiction: JurisdictionCode;
  type: 'new_regulation' | 'amendment' | 'guidance' | 'enforcement';
  effectiveDate: Date;
  publishedDate: Date;
  summary: string;
  fullText?: string;
  impactLevel: RiskLevel;
  affectedAreas: string[];
  requiredActions: string[];
  source: string;
}

export interface RegulatoryImpactAssessment {
  changeId: string;
  impactLevel: RiskLevel;
  affectedAreas: AffectedArea[];
  complianceGap: ComplianceGap[];
  remediationPlan: RemediationPlanItem[];
  implementationTimeline: string;
  estimatedCost: number;
  assessedAt: Date;
}

export interface AffectedArea {
  area: string;
  currentState: string;
  requiredState: string;
  gap: string;
}

export interface ComplianceGap {
  requirement: string;
  currentCompliance: 'full' | 'partial' | 'none';
  gapDescription: string;
  remediationRequired: boolean;
}

export interface RemediationPlanItem {
  action: string;
  responsible: string;
  deadline: Date;
  status: 'pending' | 'in_progress' | 'completed';
  dependencies: string[];
}

// ============================================================================
// Reporting Types
// ============================================================================

export interface RegulatoryReportingConfig {
  enabled: boolean;
  regulatory: RegulatoryFilingConfig;
  compliance: ComplianceReportingConfig;
  audit: AuditReportingConfig;
}

export interface RegulatoryFilingConfig {
  schedule: string;
  formats: string[];
  filings: string[];
  autoSubmit: boolean;
}

export interface ComplianceReportingConfig {
  schedule: string;
  recipients: string[];
  sections: string[];
}

export interface AuditReportingConfig {
  retention: number;
  immutable: boolean;
  externalAccess: boolean;
}

export interface RegulatoryReport {
  reportId: string;
  type: string;
  jurisdiction: JurisdictionCode;
  period: { start: Date; end: Date };
  status: 'draft' | 'pending_review' | 'submitted' | 'accepted' | 'rejected';
  format: string;
  data: Record<string, unknown>;
  generatedAt: Date;
  submittedAt?: Date;
  confirmedAt?: Date;
}

// ============================================================================
// Main Manager Config Types
// ============================================================================

export interface RegulatoryConfig {
  enabled: boolean;
  jurisdiction: JurisdictionConfig;
  licensing: LicensingConfig;
  kycAml: KycAmlConfig;
  aiGovernance: AiGovernanceConfig;
  privacy: PrivacyConfig;
  crossBorder: CrossBorderConfig;
  riskEngine: RegulatoryRiskConfig;
  reporting: RegulatoryReportingConfig;
}

export interface JurisdictionConfig {
  primary: JurisdictionCode;
  operational: JurisdictionCode[];
  entityStructure?: {
    holdingCompany: JurisdictionCode;
    operationalHubs: JurisdictionCode[];
  };
}

export interface LicensingConfig {
  tracking: boolean;
  renewalAlerts: boolean;
  alertDays: number;
  currentLicenses: CurrentLicense[];
}

export interface CurrentLicense {
  type: string;
  jurisdiction: JurisdictionCode;
  number?: string;
  expiry: Date;
  status?: 'active' | 'pending' | 'expired' | 'suspended';
}

export interface KycAmlConfig {
  enabled: boolean;
  tieredCompliance: boolean;
  defaultTier: KycTier;
  providers: KycProviders;
  sanctionsScreening: SanctionsScreeningConfig;
  transactionMonitoring: TransactionMonitoringBasicConfig;
}

export interface KycProviders {
  kyc: string[];
  sanctions: string[];
  monitoring: string[];
}

export interface TransactionMonitoringBasicConfig {
  enabled: boolean;
  realTime: boolean;
  rules: string;
}

export interface AiGovernanceConfig {
  enabled: boolean;
  euAiActCompliance: boolean;
  explainability: {
    level: ExplainabilityLevel;
    logging: boolean;
    retentionDays: number;
  };
  humanOversight: {
    required: boolean;
    level: HumanOversightLevel;
    triggers: string[];
  };
  modelGovernance: {
    versionControl: boolean;
    auditSchedule: string;
    biasMonitoring: boolean;
  };
}

// ============================================================================
// Event Types
// ============================================================================

export type RegulatoryEventType =
  | 'kyc.application_submitted'
  | 'kyc.application_approved'
  | 'kyc.application_rejected'
  | 'kyc.screening_completed'
  | 'aml.alert_created'
  | 'aml.alert_resolved'
  | 'aml.transaction_flagged'
  | 'aml.transaction_blocked'
  | 'license.expiry_warning'
  | 'license.expired'
  | 'license.renewed'
  | 'ai.model_registered'
  | 'ai.audit_scheduled'
  | 'ai.audit_completed'
  | 'ai.oversight_triggered'
  | 'privacy.dsar_received'
  | 'privacy.dsar_completed'
  | 'privacy.consent_updated'
  | 'risk.threshold_breached'
  | 'risk.regulatory_change'
  | 'risk.sar_generated'
  | 'compliance.gap_identified'
  | 'compliance.status_changed';

export interface RegulatoryEvent {
  type: RegulatoryEventType;
  timestamp: Date;
  payload: Record<string, unknown>;
  source: string;
  correlationId?: string;
}

export type RegulatoryEventCallback = (event: RegulatoryEvent) => void;

// ============================================================================
// Compliance Status Types
// ============================================================================

export interface ComplianceStatusReport {
  overall: ComplianceStatus;
  score: number;
  lastAssessed: Date;
  nextReviewDue: Date;
  areas: ComplianceAreaStatus[];
  gaps: ComplianceGap[];
  recommendations: string[];
  riskLevel: RiskLevel;
}

export interface ComplianceAreaStatus {
  area: string;
  status: ComplianceStatus;
  score: number;
  requirements: RequirementStatus[];
  notes: string[];
}

export interface RequirementStatus {
  requirement: string;
  status: ComplianceStatus;
  evidence?: string;
  lastVerified?: Date;
}
