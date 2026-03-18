/**
 * TONAIAgent - Global Institutional Network Type Definitions
 *
 * Comprehensive types for global institutional network integrating funds, banks,
 * custodians, liquidity providers, infrastructure partners, and fintech companies
 * into the TON AI ecosystem.
 *
 * This module positions the platform as:
 * - Institutional-grade AI asset management infrastructure
 * - Treasury automation layer
 * - Cross-border financial coordination system
 * - Next-generation decentralized capital network
 */

// ============================================================================
// Partner Categories Types
// ============================================================================

export type InstitutionalPartnerType =
  | 'hedge_fund'
  | 'crypto_fund'
  | 'family_office'
  | 'asset_manager'
  | 'pension_fund'
  | 'endowment'
  | 'sovereign_wealth_fund'
  | 'custodian'
  | 'prime_broker'
  | 'bank'
  | 'investment_bank'
  | 'commercial_bank'
  | 'digital_bank'
  | 'otc_desk'
  | 'market_maker'
  | 'liquidity_provider'
  | 'exchange'
  | 'infrastructure_provider'
  | 'fintech'
  | 'payment_processor'
  | 'stablecoin_issuer'
  | 'dao_treasury'
  | 'corporate_treasury'
  | 'vc_fund'
  | 'other';

export type PartnerTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'standard';

export type PartnerStatus =
  | 'prospect'
  | 'in_discussion'
  | 'due_diligence'
  | 'contracting'
  | 'onboarding'
  | 'active'
  | 'suspended'
  | 'churned'
  | 'rejected';

export interface InstitutionalPartner {
  id: string;
  name: string;
  legalName: string;
  type: InstitutionalPartnerType;
  tier: PartnerTier;
  status: PartnerStatus;
  region: GeographicRegion;
  jurisdictions: string[];
  regulatoryStatus: RegulatoryStatus;
  profile: PartnerProfile;
  capabilities: PartnerCapabilities;
  integration: IntegrationStatus;
  relationship: RelationshipDetails;
  compliance: PartnerCompliance;
  metrics: PartnerMetrics;
  contacts: PartnerContact[];
  agreements: PartnerAgreement[];
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export interface PartnerProfile {
  description: string;
  website: string;
  headquarters: string;
  foundedYear: number;
  employeeCount: string;
  aum?: string; // Assets Under Management
  tvl?: string; // Total Value Locked (for DeFi)
  rating?: string;
  specializations: string[];
  targetMarkets: string[];
  investmentFocus?: string[];
  productOfferings: string[];
}

export interface PartnerCapabilities {
  custodyServices: boolean;
  tradingServices: boolean;
  liquidityProvision: boolean;
  primeServices: boolean;
  otcTrading: boolean;
  marketMaking: boolean;
  lending: boolean;
  staking: boolean;
  derivativesTrading: boolean;
  crossBorderPayments: boolean;
  fiatOnRamp: boolean;
  fiatOffRamp: boolean;
  institutionalAccess: boolean;
  whiteGloveService: boolean;
  apiAccess: boolean;
  sdkIntegration: boolean;
  customSolutions: boolean;
}

export interface RegulatoryStatus {
  isRegulated: boolean;
  licenses: RegulatoryLicense[];
  primaryRegulator?: string;
  complianceRating: 'excellent' | 'good' | 'adequate' | 'needs_improvement' | 'pending';
  lastAuditDate?: Date;
  nextAuditDate?: Date;
  restrictions: string[];
}

export interface RegulatoryLicense {
  type: string;
  jurisdiction: string;
  regulator: string;
  licenseNumber: string;
  issuedDate: Date;
  expiryDate?: Date;
  status: 'active' | 'pending' | 'expired' | 'revoked';
  scope: string[];
}

export interface IntegrationStatus {
  isIntegrated: boolean;
  integrationLevel: 'none' | 'basic' | 'standard' | 'advanced' | 'full';
  apiConnected: boolean;
  apiVersion?: string;
  dataFeeds: DataFeedConfig[];
  liquidityPools: string[];
  custodyIntegration: boolean;
  settlementIntegration: boolean;
  reportingIntegration: boolean;
  lastSyncAt?: Date;
  healthStatus: 'healthy' | 'degraded' | 'down' | 'unknown';
}

export interface DataFeedConfig {
  feedId: string;
  feedType: 'price' | 'volume' | 'order_book' | 'trades' | 'analytics' | 'risk';
  source: string;
  frequency: string;
  latencyMs: number;
  reliability: number;
  isActive: boolean;
}

export interface RelationshipDetails {
  accountManager: string;
  relationshipStartDate: Date;
  contractValue?: string;
  revenueTier: 'enterprise' | 'premium' | 'standard' | 'basic';
  slaLevel: 'platinum' | 'gold' | 'silver' | 'standard';
  exclusivityTerms?: string[];
  strategicImportance: 'critical' | 'high' | 'medium' | 'low';
  nextReviewDate?: Date;
  notes?: string;
}

export interface PartnerCompliance {
  kycStatus: 'approved' | 'pending' | 'expired' | 'rejected';
  kycCompletedAt?: Date;
  kycExpiresAt?: Date;
  amlStatus: 'compliant' | 'review_required' | 'flagged';
  sanctionsScreening: 'clear' | 'pending' | 'match_found';
  lastScreeningDate?: Date;
  riskRating: 'low' | 'medium' | 'high' | 'prohibited';
  dueDiligenceLevel: 'basic' | 'standard' | 'enhanced';
  requiredDocuments: ComplianceDocument[];
}

export interface ComplianceDocument {
  type: string;
  status: 'received' | 'pending' | 'expired' | 'rejected';
  uploadedAt?: Date;
  expiresAt?: Date;
  verified: boolean;
  verifiedBy?: string;
}

export interface PartnerMetrics {
  totalVolume: string;
  monthlyVolume: string;
  averageDailyVolume: string;
  totalTransactions: number;
  activeUsers?: number;
  liquidityProvided?: string;
  assetsUnderCustody?: string;
  uptime: number;
  responseTime: number;
  satisfactionScore?: number;
  lastActivityAt: Date;
}

export interface PartnerContact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone?: string;
  role: 'primary' | 'technical' | 'compliance' | 'operations' | 'executive';
  isPrimary: boolean;
  notes?: string;
}

export interface PartnerAgreement {
  id: string;
  type: 'mou' | 'nda' | 'partnership' | 'service' | 'integration' | 'commercial';
  title: string;
  status: 'draft' | 'negotiating' | 'pending_signature' | 'active' | 'expired' | 'terminated';
  effectiveDate?: Date;
  expirationDate?: Date;
  autoRenewal: boolean;
  terms: AgreementTerms;
  signedBy?: string[];
  documentUrl?: string;
}

export interface AgreementTerms {
  minimumCommitment?: string;
  revenueShare?: number;
  exclusivity?: boolean;
  territorialRights?: string[];
  serviceLevels?: string[];
  terminationClause?: string;
}

// ============================================================================
// Geographic & Regional Types
// ============================================================================

export type GeographicRegion =
  | 'north_america'
  | 'south_america'
  | 'europe'
  | 'middle_east'
  | 'africa'
  | 'asia_pacific'
  | 'central_asia'
  | 'oceania'
  | 'global';

export interface RegionalPresence {
  region: GeographicRegion;
  countries: CountryPresence[];
  headquarters?: boolean;
  officeCount: number;
  employeeCount: number;
  regulatoryStatus: 'licensed' | 'pending' | 'not_applicable';
  localPartners: string[];
  marketShare?: number;
}

export interface CountryPresence {
  countryCode: string;
  countryName: string;
  presenceType: 'headquarters' | 'subsidiary' | 'branch' | 'representative' | 'partner';
  regulatedEntity: boolean;
  licenseType?: string;
  localContacts: string[];
}

// ============================================================================
// Custody & Capital Infrastructure Types
// ============================================================================

export type CustodyProvider = 'internal' | 'external' | 'hybrid' | 'mpc' | 'smart_contract';

export type CustodySecurityLevel = 'standard' | 'enhanced' | 'institutional' | 'sovereign';

export interface CustodyConfiguration {
  id: string;
  partnerId?: string;
  provider: CustodyProvider;
  securityLevel: CustodySecurityLevel;
  infrastructure: CustodyInfrastructure;
  policies: CustodyPolicies;
  insurance: InsuranceCoverage;
  compliance: CustodyCompliance;
  reporting: CustodyReporting;
  sla: CustodySLA;
  status: 'active' | 'pending' | 'suspended' | 'terminated';
  createdAt: Date;
  updatedAt: Date;
}

export interface CustodyInfrastructure {
  mpcEnabled: boolean;
  mpcThreshold?: string;
  mpcProviders?: string[];
  hsmEnabled: boolean;
  hsmProvider?: string;
  hsmCertification?: string;
  coldStoragePercentage: number;
  hotWalletLimit: string;
  multiSigRequired: boolean;
  multiSigScheme?: string;
  geographicDistribution: string[];
  disasterRecovery: DisasterRecoveryConfig;
}

export interface DisasterRecoveryConfig {
  enabled: boolean;
  rtoHours: number; // Recovery Time Objective
  rpoHours: number; // Recovery Point Objective
  backupLocations: string[];
  testFrequency: string;
  lastTestDate?: Date;
  testResult?: 'passed' | 'failed' | 'partial';
}

export interface CustodyPolicies {
  withdrawalApprovalProcess: ApprovalProcess;
  largeTransactionThreshold: string;
  whitelistRequired: boolean;
  timeDelayedWithdrawals: boolean;
  timeDelayHours?: number;
  dualControlRequired: boolean;
  segregatedAccounts: boolean;
  clientAssetProtection: boolean;
}

export interface ApprovalProcess {
  levels: ApprovalLevel[];
  escalationRules: EscalationRule[];
  timeoutHours: number;
  autoRejectOnTimeout: boolean;
}

export interface ApprovalLevel {
  level: number;
  threshold: string;
  requiredApprovers: number;
  approverRoles: string[];
  approverTypes: ('internal' | 'client' | 'third_party')[];
}

export interface EscalationRule {
  triggerAfterHours: number;
  escalateTo: string[];
  notificationChannels: string[];
  autoApprove: boolean;
}

export interface InsuranceCoverage {
  enabled: boolean;
  provider: string;
  coverageAmount: string;
  coverageType: 'crime' | 'cyber' | 'comprehensive' | 'specie';
  deductible?: string;
  policyNumber?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
  exclusions?: string[];
}

export interface CustodyCompliance {
  soc2Certified: boolean;
  soc2Type?: 'type1' | 'type2';
  soc2ReportDate?: Date;
  iso27001Certified: boolean;
  iso27001CertDate?: Date;
  regulatoryCompliance: string[];
  auditFrequency: string;
  lastAuditDate?: Date;
  auditFindings?: string[];
}

export interface CustodyReporting {
  realTimeBalance: boolean;
  transactionHistory: boolean;
  proofOfReserves: boolean;
  porFrequency?: string;
  lastPorDate?: Date;
  porVerifier?: string;
  customReports: string[];
  apiAccess: boolean;
}

export interface CustodySLA {
  availabilityTarget: number;
  withdrawalProcessingTime: string;
  supportResponseTime: string;
  incidentResponseTime: string;
  reportingFrequency: string;
  penalties: SLAPenalty[];
}

export interface SLAPenalty {
  metric: string;
  threshold: string;
  penalty: string;
  measurementPeriod: string;
}

// ============================================================================
// Liquidity Network Types
// ============================================================================

export type LiquiditySourceType =
  | 'exchange'
  | 'amm'
  | 'otc_desk'
  | 'market_maker'
  | 'prime_broker'
  | 'institutional_pool'
  | 'aggregator'
  | 'internal';

export interface LiquiditySource {
  id: string;
  name: string;
  type: LiquiditySourceType;
  partnerId?: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  configuration: LiquiditySourceConfig;
  pairs: TradingPair[];
  metrics: LiquidityMetrics;
  routing: RoutingConfig;
  fees: FeeStructure;
  limits: LiquidityLimits;
  createdAt: Date;
  updatedAt: Date;
}

export interface LiquiditySourceConfig {
  apiEndpoint?: string;
  connectionType: 'rest' | 'websocket' | 'fix' | 'direct';
  authentication: 'api_key' | 'oauth' | 'certificate' | 'mpc';
  rateLimit: number;
  timeout: number;
  retryPolicy: RetryPolicy;
  healthCheckInterval: number;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

export interface TradingPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  minOrderSize: string;
  maxOrderSize: string;
  tickSize: string;
  stepSize: string;
  status: 'active' | 'suspended' | 'delisted';
  tradingHours?: string;
}

export interface LiquidityMetrics {
  totalVolume24h: string;
  totalVolume30d: string;
  averageSpread: number;
  averageDepth: string;
  fillRate: number;
  averageSlippage: number;
  uptime: number;
  latencyMs: number;
  lastTradeAt: Date;
  lastUpdatedAt: Date;
}

export interface RoutingConfig {
  priority: number;
  weight: number;
  maxAllocation: number;
  minAllocation: number;
  excludedPairs: string[];
  excludedHours?: string[];
  smartRouting: boolean;
  priceImprovement: boolean;
  antiGaming: boolean;
}

export interface FeeStructure {
  makerFee: number;
  takerFee: number;
  volumeDiscounts: VolumeDiscount[];
  rebates: Rebate[];
  settlementFee: number;
  withdrawalFee: Record<string, string>;
  minimumFee?: string;
}

export interface VolumeDiscount {
  threshold: string;
  makerDiscount: number;
  takerDiscount: number;
}

export interface Rebate {
  type: 'maker' | 'volume' | 'loyalty';
  amount: number;
  conditions: string[];
}

export interface LiquidityLimits {
  dailyLimit: string;
  weeklyLimit: string;
  monthlyLimit: string;
  perTradeLimit: string;
  exposureLimit: string;
  concentrationLimit: number;
}

// ============================================================================
// Aggregated Liquidity Types
// ============================================================================

export interface LiquidityAggregator {
  id: string;
  name: string;
  sources: string[]; // LiquiditySource IDs
  strategy: AggregationStrategy;
  routing: SmartRoutingConfig;
  execution: ExecutionConfig;
  riskLimits: AggregatorRiskLimits;
  metrics: AggregatorMetrics;
  status: 'active' | 'paused' | 'maintenance';
}

export interface AggregationStrategy {
  type: 'best_price' | 'best_execution' | 'vwap' | 'twap' | 'custom';
  parameters: Record<string, unknown>;
  rebalanceFrequency: string;
  slippageTolerance: number;
  priceDeviationThreshold: number;
}

export interface SmartRoutingConfig {
  enabled: boolean;
  algorithm: 'greedy' | 'optimized' | 'ml_based';
  considerFees: boolean;
  considerLatency: boolean;
  considerDepth: boolean;
  maxSources: number;
  minSources: number;
  splitOrders: boolean;
  maxSplits: number;
}

export interface ExecutionConfig {
  defaultOrderType: 'market' | 'limit' | 'ioc' | 'fok' | 'twap' | 'vwap';
  timeInForce: 'gtc' | 'ioc' | 'fok' | 'day';
  partialFillAllowed: boolean;
  priceProtection: boolean;
  maxSlippage: number;
  retryOnFailure: boolean;
  maxRetries: number;
}

export interface AggregatorRiskLimits {
  maxExposure: string;
  maxDrawdown: number;
  maxLossPerTrade: string;
  maxDailyLoss: string;
  concentrationLimit: number;
  velocityLimitPerMinute: number;
}

export interface AggregatorMetrics {
  totalVolume: string;
  totalTrades: number;
  averageExecutionPrice: number;
  priceSavings: string;
  averageLatency: number;
  fillRate: number;
  rejectionRate: number;
  slippageStats: SlippageStats;
}

export interface SlippageStats {
  average: number;
  median: number;
  p95: number;
  max: number;
  distribution: Record<string, number>;
}

// ============================================================================
// Treasury Interoperability Types
// ============================================================================

export type TreasuryType =
  | 'dao_treasury'
  | 'corporate_treasury'
  | 'fund_treasury'
  | 'protocol_treasury'
  | 'foundation_treasury'
  | 'multisig_treasury';

export interface TreasuryConnection {
  id: string;
  name: string;
  type: TreasuryType;
  partnerId?: string;
  status: 'active' | 'pending' | 'suspended' | 'disconnected';
  configuration: TreasuryConfig;
  permissions: TreasuryPermissions;
  allocation: AllocationStrategy;
  automation: AutomationConfig;
  reporting: TreasuryReportingConfig;
  metrics: TreasuryMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export interface TreasuryConfig {
  blockchain: string;
  address: string;
  contractType: 'multisig' | 'timelock' | 'governor' | 'safe' | 'custom';
  signers: TreasurySigner[];
  threshold: number;
  timelockDelay?: number;
  executionDelay?: number;
  connectionMethod: 'direct' | 'bridge' | 'oracle' | 'api';
}

export interface TreasurySigner {
  address: string;
  name?: string;
  role: string;
  weight: number;
  isActive: boolean;
}

export interface TreasuryPermissions {
  canDeposit: boolean;
  canWithdraw: boolean;
  canTrade: boolean;
  canStake: boolean;
  canLend: boolean;
  canBorrow: boolean;
  canVote: boolean;
  maxWithdrawalPerTx: string;
  maxDailyWithdrawal: string;
  whitelistedAssets: string[];
  whitelistedProtocols: string[];
}

export interface AllocationStrategy {
  type: 'passive' | 'active' | 'hybrid' | 'ai_managed';
  targetAllocations: TargetAllocation[];
  rebalanceThreshold: number;
  rebalanceFrequency: string;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  yieldTargetApy?: number;
  maxDrawdown?: number;
}

export interface TargetAllocation {
  asset: string;
  targetPercent: number;
  minPercent: number;
  maxPercent: number;
  category: 'stable' | 'volatile' | 'yield' | 'governance' | 'liquidity';
}

export interface AutomationConfig {
  enabled: boolean;
  automationLevel: 'none' | 'basic' | 'advanced' | 'full_autonomy';
  agentIds: string[];
  automatedOperations: AutomatedOperation[];
  approvalRequired: boolean;
  approvalThreshold: string;
  emergencyStop: boolean;
  emergencyContacts: string[];
}

export interface AutomatedOperation {
  type: 'rebalance' | 'yield_harvest' | 'stake' | 'unstake' | 'swap' | 'vote' | 'claim';
  enabled: boolean;
  frequency?: string;
  conditions?: OperationCondition[];
  limits: OperationLimits;
}

export interface OperationCondition {
  parameter: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
  value: unknown;
}

export interface OperationLimits {
  maxAmount: string;
  maxFrequency: string;
  cooldownPeriod: number;
  maxSlippage?: number;
}

export interface TreasuryReportingConfig {
  enabled: boolean;
  frequency: 'real_time' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  reports: string[];
  recipients: string[];
  format: 'json' | 'csv' | 'pdf';
  webhookUrl?: string;
}

export interface TreasuryMetrics {
  totalValue: string;
  valueChange24h: number;
  valueChange7d: number;
  valueChange30d: number;
  assetCount: number;
  yieldGenerated: string;
  yieldApy: number;
  transactionCount: number;
  lastActivityAt: Date;
}

// ============================================================================
// Institutional Onboarding Types
// ============================================================================

export interface OnboardingWorkflow {
  id: string;
  partnerId: string;
  partnerType: InstitutionalPartnerType;
  status: OnboardingStatus;
  currentPhase: OnboardingPhase;
  phases: OnboardingPhaseDetail[];
  dueDiligence: DueDiligenceProcess;
  compliance: OnboardingComplianceCheck;
  integration: OnboardingIntegration;
  timeline: OnboardingTimeline;
  assignedTo: string;
  startedAt: Date;
  completedAt?: Date;
  metadata: Record<string, unknown>;
}

export type OnboardingStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_review'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'on_hold'
  | 'completed';

export type OnboardingPhase =
  | 'initial_contact'
  | 'qualification'
  | 'due_diligence'
  | 'compliance_review'
  | 'legal_review'
  | 'agreement_negotiation'
  | 'technical_integration'
  | 'testing'
  | 'go_live'
  | 'completed';

export interface OnboardingPhaseDetail {
  phase: OnboardingPhase;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  startedAt?: Date;
  completedAt?: Date;
  assignedTo?: string;
  tasks: OnboardingTask[];
  blockers?: string[];
  notes?: string;
}

export interface OnboardingTask {
  id: string;
  name: string;
  description: string;
  type: 'document' | 'meeting' | 'approval' | 'technical' | 'review' | 'other';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';
  required: boolean;
  assignedTo?: string;
  dueDate?: Date;
  completedAt?: Date;
  completedBy?: string;
  attachments?: string[];
  notes?: string;
}

export interface DueDiligenceProcess {
  level: 'basic' | 'standard' | 'enhanced' | 'institutional';
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  categories: DueDiligenceCategory[];
  overallRiskScore?: number;
  overallRiskRating?: 'low' | 'medium' | 'high' | 'critical';
  recommendation?: 'approve' | 'reject' | 'escalate' | 'additional_review';
  completedAt?: Date;
  completedBy?: string;
  approvedBy?: string;
}

export interface DueDiligenceCategory {
  name: string;
  type: 'corporate' | 'financial' | 'operational' | 'regulatory' | 'technical' | 'reputational';
  status: 'not_started' | 'in_progress' | 'completed';
  score?: number;
  findings: DueDiligenceFinding[];
  documents: string[];
}

export interface DueDiligenceFinding {
  id: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  evidence?: string;
  mitigation?: string;
  status: 'open' | 'mitigated' | 'accepted' | 'escalated';
  createdAt: Date;
  resolvedAt?: Date;
}

export interface OnboardingComplianceCheck {
  kycStatus: 'not_started' | 'in_progress' | 'approved' | 'rejected';
  amlStatus: 'not_started' | 'in_progress' | 'cleared' | 'flagged';
  sanctionsStatus: 'not_started' | 'in_progress' | 'cleared' | 'match_found';
  pepStatus: 'not_started' | 'in_progress' | 'cleared' | 'identified';
  adverseMediaStatus: 'not_started' | 'in_progress' | 'cleared' | 'flagged';
  requiredDocuments: RequiredDocument[];
  overallStatus: 'pending' | 'approved' | 'rejected' | 'conditional';
}

export interface RequiredDocument {
  type: string;
  name: string;
  required: boolean;
  status: 'pending' | 'received' | 'verified' | 'rejected' | 'expired';
  uploadedAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
  expiresAt?: Date;
  notes?: string;
}

export interface OnboardingIntegration {
  status: 'not_started' | 'in_progress' | 'testing' | 'completed';
  integrationType: 'api' | 'sdk' | 'white_label' | 'custom';
  technicalContact?: string;
  apiCredentialsIssued: boolean;
  sandboxAccess: boolean;
  productionAccess: boolean;
  integrationTasks: IntegrationTask[];
  testResults?: TestResults;
}

export interface IntegrationTask {
  id: string;
  name: string;
  category: 'setup' | 'configuration' | 'testing' | 'certification';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completedAt?: Date;
  notes?: string;
}

export interface TestResults {
  passed: boolean;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  coveragePercent: number;
  issues: string[];
  testedAt: Date;
  approvedBy?: string;
}

export interface OnboardingTimeline {
  estimatedDuration: number; // days
  actualDuration?: number;
  milestones: OnboardingMilestone[];
  delays: OnboardingDelay[];
}

export interface OnboardingMilestone {
  name: string;
  targetDate: Date;
  actualDate?: Date;
  status: 'pending' | 'completed' | 'missed' | 'at_risk';
}

export interface OnboardingDelay {
  reason: string;
  duration: number; // days
  category: 'internal' | 'partner' | 'regulatory' | 'technical' | 'other';
  mitigated: boolean;
  recordedAt: Date;
}

// ============================================================================
// Institutional Reporting Types
// ============================================================================

export interface InstitutionalNetworkReport {
  id: string;
  type: NetworkReportType;
  title: string;
  period: ReportingPeriod;
  generatedAt: Date;
  generatedBy: string;
  sections: ReportSection[];
  summary: ReportSummary;
  metrics: NetworkMetrics;
  attachments: ReportAttachment[];
  distribution: ReportDistribution;
}

export type NetworkReportType =
  | 'network_overview'
  | 'partner_performance'
  | 'liquidity_report'
  | 'custody_report'
  | 'compliance_report'
  | 'risk_report'
  | 'expansion_report'
  | 'executive_summary'
  | 'regulatory_filing'
  | 'audit_report'
  | 'custom';

export interface ReportingPeriod {
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
  startDate: Date;
  endDate: Date;
  timezone: string;
}

export interface ReportSection {
  id: string;
  title: string;
  order: number;
  content: ReportContent;
  charts: ReportChart[];
  tables: ReportTable[];
  insights: string[];
}

export interface ReportContent {
  type: 'text' | 'metrics' | 'comparison' | 'trend_analysis';
  data: Record<string, unknown>;
  narrative?: string;
}

export interface ReportChart {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap' | 'treemap';
  dataSource: string;
  config: Record<string, unknown>;
}

export interface ReportTable {
  id: string;
  title: string;
  columns: TableColumn[];
  data: Record<string, unknown>[];
  sortable: boolean;
  paginated: boolean;
}

export interface TableColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'currency' | 'percent' | 'date' | 'status';
  sortable: boolean;
  width?: string;
}

export interface ReportSummary {
  keyHighlights: string[];
  keyMetrics: KeyMetric[];
  recommendations: string[];
  alerts: ReportAlert[];
  actionItems: ActionItem[];
}

export interface KeyMetric {
  name: string;
  value: string | number;
  change?: number;
  changePercent?: number;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
}

export interface ReportAlert {
  severity: 'info' | 'warning' | 'critical';
  message: string;
  category: string;
  timestamp: Date;
}

export interface ActionItem {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  assignee?: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface ReportAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface ReportDistribution {
  recipients: ReportRecipient[];
  deliveryMethod: 'email' | 'portal' | 'api' | 'sftp';
  scheduledAt?: Date;
  deliveredAt?: Date;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
}

export interface ReportRecipient {
  name: string;
  email: string;
  role: string;
  organization: string;
}

// ============================================================================
// Network Metrics Types
// ============================================================================

export interface NetworkMetrics {
  timestamp: Date;
  partners: PartnerNetworkMetrics;
  liquidity: LiquidityNetworkMetrics;
  custody: CustodyNetworkMetrics;
  volume: VolumeMetrics;
  performance: PerformanceMetrics;
  risk: NetworkRiskMetrics;
  compliance: ComplianceMetrics;
}

export interface PartnerNetworkMetrics {
  totalPartners: number;
  activePartners: number;
  partnersByType: Record<InstitutionalPartnerType, number>;
  partnersByTier: Record<PartnerTier, number>;
  partnersByRegion: Record<GeographicRegion, number>;
  newPartnersThisPeriod: number;
  churnedPartnersThisPeriod: number;
  averagePartnerTenure: number;
  averagePartnerSatisfaction: number;
}

export interface LiquidityNetworkMetrics {
  totalLiquiditySources: number;
  activeLiquiditySources: number;
  totalAvailableLiquidity: string;
  averageSpread: number;
  averageDepth: string;
  totalVolume24h: string;
  totalVolume7d: string;
  totalVolume30d: string;
  fillRate: number;
  averageSlippage: number;
  uptime: number;
}

export interface CustodyNetworkMetrics {
  totalCustodyProviders: number;
  totalAssetsUnderCustody: string;
  aucChange24h: number;
  aucChange7d: number;
  aucChange30d: number;
  averageSecurityScore: number;
  insuranceCoverage: string;
  proofOfReservesCompliant: number;
  incidentsThisPeriod: number;
}

export interface VolumeMetrics {
  totalVolume: string;
  volumeByAsset: Record<string, string>;
  volumeByPartner: Record<string, string>;
  volumeByRegion: Record<string, string>;
  transactionCount: number;
  averageTransactionSize: string;
  largestTransaction: string;
  volumeTrend: 'increasing' | 'decreasing' | 'stable';
}

export interface PerformanceMetrics {
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  uptime: number;
  errorRate: number;
  throughput: number;
  successRate: number;
  averageSettlementTime: number;
}

export interface NetworkRiskMetrics {
  overallRiskScore: number;
  riskByCategory: Record<string, number>;
  concentrationRisk: ConcentrationRiskMetrics;
  counterpartyRisk: CounterpartyRiskMetrics;
  operationalRisk: OperationalRiskMetrics;
  marketRisk: MarketRiskMetrics;
  openIssues: number;
  criticalIssues: number;
}

export interface ConcentrationRiskMetrics {
  topPartnerConcentration: number;
  topAssetConcentration: number;
  topRegionConcentration: number;
  herfindahlIndex: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface CounterpartyRiskMetrics {
  averageCounterpartyRating: number;
  highRiskCounterparties: number;
  exposureToHighRisk: string;
  defaultProbability: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface OperationalRiskMetrics {
  incidentCount: number;
  averageResolutionTime: number;
  systemAvailability: number;
  processFailureRate: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface MarketRiskMetrics {
  volatility: number;
  beta: number;
  var95: string;
  var99: string;
  maxDrawdown: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ComplianceMetrics {
  overallComplianceScore: number;
  partnersFullyCompliant: number;
  partnersPartiallyCompliant: number;
  partnersNonCompliant: number;
  pendingKyc: number;
  expiringKyc: number;
  amlAlerts: number;
  sanctionsMatches: number;
  regulatoryIssues: number;
}

// ============================================================================
// Global Expansion Types
// ============================================================================

export interface ExpansionStrategy {
  id: string;
  name: string;
  status: 'planning' | 'approved' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  regions: RegionExpansionPlan[];
  partnerships: PartnershipPlan[];
  timeline: ExpansionTimeline;
  budget: ExpansionBudget;
  kpis: ExpansionKPI[];
  risks: ExpansionRisk[];
  progress: ExpansionProgress;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegionExpansionPlan {
  region: GeographicRegion;
  priority: 'high' | 'medium' | 'low';
  status: 'research' | 'planning' | 'entry' | 'growth' | 'mature';
  targetCountries: string[];
  entryStrategy: 'organic' | 'partnership' | 'acquisition' | 'hybrid';
  regulatoryApproach: RegulatoryApproach;
  localPartners: string[];
  targetMetrics: RegionTargetMetrics;
  timeline: PhasedTimeline;
  investmentRequired: string;
  risks: string[];
}

export interface RegulatoryApproach {
  strategy: 'license' | 'partnership' | 'sandbox' | 'exempt' | 'pending_analysis';
  targetLicenses: string[];
  estimatedTimeMonths: number;
  estimatedCost: string;
  currentStatus: 'not_started' | 'in_progress' | 'obtained' | 'rejected';
  notes?: string;
}

export interface RegionTargetMetrics {
  partnerCount: number;
  tvlTarget: string;
  volumeTarget: string;
  userTarget: number;
  revenueTarget: string;
  timeframeMonths: number;
}

export interface PhasedTimeline {
  phases: ExpansionPhase[];
  startDate: Date;
  targetEndDate: Date;
  actualEndDate?: Date;
}

export interface ExpansionPhase {
  name: string;
  order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  startDate: Date;
  endDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  deliverables: string[];
  milestones: PhaseMilestone[];
}

export interface PhaseMilestone {
  name: string;
  targetDate: Date;
  actualDate?: Date;
  status: 'pending' | 'achieved' | 'missed' | 'at_risk';
  notes?: string;
}

export interface PartnershipPlan {
  targetType: InstitutionalPartnerType;
  count: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  criteria: PartnerCriteria;
  prospects: PartnerProspect[];
  strategy: string;
  timeline: string;
}

export interface PartnerCriteria {
  minAum?: string;
  minVolume?: string;
  requiredLicenses?: string[];
  requiredCapabilities?: string[];
  preferredRegions?: string[];
  exclusions?: string[];
}

export interface PartnerProspect {
  id: string;
  name: string;
  type: InstitutionalPartnerType;
  region: GeographicRegion;
  status: 'identified' | 'contacted' | 'in_discussion' | 'negotiating' | 'closed' | 'lost';
  priority: 'high' | 'medium' | 'low';
  estimatedValue: string;
  nextAction?: string;
  nextActionDate?: Date;
  assignedTo?: string;
  notes?: string;
}

export interface ExpansionTimeline {
  totalDurationMonths: number;
  phases: ExpansionPhase[];
  criticalPath: string[];
  dependencies: TimelineDependency[];
}

export interface TimelineDependency {
  from: string;
  to: string;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish';
  lagDays: number;
}

export interface ExpansionBudget {
  totalBudget: string;
  allocated: string;
  spent: string;
  remaining: string;
  categories: BudgetCategory[];
  contingency: string;
  contingencyUsed: string;
}

export interface BudgetCategory {
  name: string;
  budgeted: string;
  spent: string;
  variance: string;
  variancePercent: number;
}

export interface ExpansionKPI {
  name: string;
  target: string | number;
  current: string | number;
  unit: string;
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved';
  trend: 'up' | 'down' | 'stable';
  lastUpdated: Date;
}

export interface ExpansionRisk {
  id: string;
  category: 'regulatory' | 'operational' | 'market' | 'competitive' | 'financial' | 'reputational';
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
  owner: string;
  status: 'open' | 'mitigated' | 'accepted' | 'closed';
}

export interface ExpansionProgress {
  overallProgress: number;
  phaseProgress: Record<string, number>;
  milestonesAchieved: number;
  milestonesTotal: number;
  partnersOnboarded: number;
  partnersTarget: number;
  regionsEntered: number;
  regionsTarget: number;
  lastUpdated: Date;
}

// ============================================================================
// AI-Powered Advantage Types
// ============================================================================

export interface AIInstitutionalCapabilities {
  riskModeling: AIRiskModeling;
  capitalAllocation: AICapitalAllocation;
  anomalyDetection: AIAnomalyDetection;
  performanceAnalytics: AIPerformanceAnalytics;
  partnerMatching: AIPartnerMatching;
  complianceMonitoring: AIComplianceMonitoring;
}

export interface AIRiskModeling {
  enabled: boolean;
  models: AIRiskModel[];
  realTimeAssessment: boolean;
  predictionHorizon: string;
  confidenceLevel: number;
  lastModelUpdate: Date;
  accuracy: number;
}

export interface AIRiskModel {
  id: string;
  name: string;
  type: 'credit' | 'market' | 'liquidity' | 'operational' | 'counterparty';
  version: string;
  accuracy: number;
  features: string[];
  status: 'active' | 'training' | 'deprecated';
  lastTrainedAt: Date;
}

export interface AICapitalAllocation {
  enabled: boolean;
  strategy: 'optimize_return' | 'minimize_risk' | 'balanced' | 'custom';
  rebalanceFrequency: string;
  constraints: AllocationConstraint[];
  performance: AllocationPerformance;
  recommendations: AllocationRecommendation[];
}

export interface AllocationConstraint {
  type: 'min_allocation' | 'max_allocation' | 'sector_limit' | 'risk_limit' | 'custom';
  parameter: string;
  value: number;
  priority: number;
}

export interface AllocationPerformance {
  returnVsBenchmark: number;
  sharpeRatio: number;
  informationRatio: number;
  trackingError: number;
  rebalanceCount: number;
  lastRebalanceAt: Date;
}

export interface AllocationRecommendation {
  id: string;
  type: 'increase' | 'decrease' | 'rebalance' | 'exit' | 'enter';
  asset: string;
  currentAllocation: number;
  recommendedAllocation: number;
  reason: string;
  confidence: number;
  expectedImpact: string;
  priority: 'high' | 'medium' | 'low';
  generatedAt: Date;
  expiresAt: Date;
}

export interface AIAnomalyDetection {
  enabled: boolean;
  monitoredMetrics: string[];
  sensitivity: 'low' | 'medium' | 'high';
  detectionMethods: string[];
  alertThreshold: number;
  anomaliesDetected: number;
  falsePositiveRate: number;
  lastScanAt: Date;
}

export interface AIPerformanceAnalytics {
  enabled: boolean;
  metrics: PerformanceMetricConfig[];
  benchmarks: string[];
  attributionEnabled: boolean;
  forecastingEnabled: boolean;
  reportFrequency: string;
}

export interface PerformanceMetricConfig {
  name: string;
  calculation: string;
  frequency: string;
  benchmark?: string;
  threshold?: number;
}

export interface AIPartnerMatching {
  enabled: boolean;
  matchingCriteria: MatchingCriteria[];
  scoringModel: string;
  minMatchScore: number;
  maxRecommendations: number;
  refreshFrequency: string;
}

export interface MatchingCriteria {
  criterion: string;
  weight: number;
  required: boolean;
}

export interface AIComplianceMonitoring {
  enabled: boolean;
  monitoredRules: string[];
  automatedChecks: boolean;
  alertOnViolation: boolean;
  predictionEnabled: boolean;
  riskScoring: boolean;
  lastScanAt: Date;
  violationsDetected: number;
}

// ============================================================================
// Institutional Governance Types
// ============================================================================

export interface InstitutionalGovernance {
  id: string;
  networkId: string;
  structure: GovernanceStructure;
  advisoryBoard: AdvisoryBoard;
  committees: GovernanceCommittee[];
  policies: GovernancePolicy[];
  votingMechanisms: VotingMechanism[];
  decisionLog: GovernanceDecision[];
  status: 'active' | 'restructuring' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface GovernanceStructure {
  type: 'centralized' | 'decentralized' | 'hybrid';
  tiers: GovernanceTier[];
  decisionAuthority: DecisionAuthority[];
  escalationPath: string[];
}

export interface GovernanceTier {
  level: number;
  name: string;
  description: string;
  members: GovernanceMember[];
  authority: string[];
  votingPower: number;
}

export interface GovernanceMember {
  id: string;
  name: string;
  organization: string;
  role: string;
  tier: number;
  votingPower: number;
  joinedAt: Date;
  term?: TermDetails;
  status: 'active' | 'inactive' | 'suspended';
}

export interface TermDetails {
  startDate: Date;
  endDate: Date;
  renewable: boolean;
  maxTerms: number;
  currentTerm: number;
}

export interface DecisionAuthority {
  decisionType: string;
  authorityLevel: number;
  requiredApprovals: number;
  votingThreshold: number;
  timeLimit: number;
}

export interface AdvisoryBoard {
  id: string;
  name: string;
  purpose: string;
  members: AdvisoryMember[];
  meetingFrequency: string;
  lastMeetingDate?: Date;
  nextMeetingDate?: Date;
  charter?: string;
  resolutions: BoardResolution[];
}

export interface AdvisoryMember {
  id: string;
  name: string;
  title: string;
  organization: string;
  expertise: string[];
  appointedAt: Date;
  term: TermDetails;
  status: 'active' | 'emeritus' | 'resigned';
  bio?: string;
}

export interface BoardResolution {
  id: string;
  title: string;
  description: string;
  type: 'strategic' | 'operational' | 'policy' | 'appointment';
  status: 'proposed' | 'under_review' | 'approved' | 'rejected' | 'implemented';
  proposedBy: string;
  proposedAt: Date;
  votingResult?: VotingResult;
  implementedAt?: Date;
}

export interface VotingResult {
  votesFor: number;
  votesAgainst: number;
  abstentions: number;
  quorumMet: boolean;
  thresholdMet: boolean;
  outcome: 'passed' | 'failed' | 'tied';
  votedAt: Date;
}

export interface GovernanceCommittee {
  id: string;
  name: string;
  type: CommitteeType;
  purpose: string;
  members: CommitteeMember[];
  charter: string;
  meetingFrequency: string;
  lastMeetingDate?: Date;
  decisions: CommitteeDecision[];
  status: 'active' | 'dissolved';
}

export type CommitteeType =
  | 'risk'
  | 'compliance'
  | 'investment'
  | 'technology'
  | 'audit'
  | 'nomination'
  | 'compensation'
  | 'strategic'
  | 'special';

export interface CommitteeMember {
  id: string;
  memberId: string;
  name: string;
  role: 'chair' | 'member' | 'observer' | 'secretary';
  joinedAt: Date;
  votingRights: boolean;
}

export interface CommitteeDecision {
  id: string;
  committeeId: string;
  title: string;
  description: string;
  category: string;
  status: 'proposed' | 'approved' | 'rejected' | 'implemented' | 'deferred';
  impact: 'high' | 'medium' | 'low';
  proposedAt: Date;
  decidedAt?: Date;
  implementedAt?: Date;
  votes?: VotingResult;
}

export interface GovernancePolicy {
  id: string;
  name: string;
  category: PolicyCategory;
  version: string;
  status: 'draft' | 'review' | 'approved' | 'active' | 'retired';
  effectiveDate?: Date;
  expiryDate?: Date;
  owner: string;
  approvedBy?: string;
  content: string;
  attachments?: string[];
  relatedPolicies?: string[];
  complianceRequired: boolean;
  reviewFrequency: string;
  lastReviewDate?: Date;
  nextReviewDate?: Date;
}

export type PolicyCategory =
  | 'risk_management'
  | 'compliance'
  | 'operations'
  | 'technology'
  | 'security'
  | 'privacy'
  | 'ethics'
  | 'partner_management'
  | 'treasury'
  | 'reporting';

export interface VotingMechanism {
  id: string;
  name: string;
  type: 'simple_majority' | 'supermajority' | 'unanimous' | 'weighted' | 'quadratic';
  applicableTo: string[];
  quorumRequirement: number;
  threshold: number;
  votingPeriod: number; // hours
  tieBreaker?: string;
  vetoRights?: VetoRight[];
}

export interface VetoRight {
  holder: string;
  scope: string[];
  conditions?: string[];
}

export interface GovernanceDecision {
  id: string;
  type: string;
  title: string;
  description: string;
  initiatedBy: string;
  initiatedAt: Date;
  mechanism: string;
  status: 'pending' | 'voting' | 'approved' | 'rejected' | 'implemented' | 'vetoed';
  votes?: VotingResult;
  implementedAt?: Date;
  implementedBy?: string;
  impact: string;
  documentation?: string;
}

// ============================================================================
// Event Types
// ============================================================================

export interface InstitutionalNetworkEvent {
  id: string;
  timestamp: Date;
  type: NetworkEventType;
  category: EventCategory;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  sourceId: string;
  action: string;
  description: string;
  details: Record<string, unknown>;
  affectedEntities: AffectedEntity[];
  metadata: Record<string, unknown>;
}

export type NetworkEventType =
  | 'partner_onboarded'
  | 'partner_status_changed'
  | 'partner_churned'
  | 'integration_connected'
  | 'integration_disconnected'
  | 'liquidity_added'
  | 'liquidity_removed'
  | 'custody_configured'
  | 'custody_alert'
  | 'treasury_connected'
  | 'treasury_operation'
  | 'compliance_alert'
  | 'compliance_updated'
  | 'risk_alert'
  | 'risk_threshold_breach'
  | 'governance_decision'
  | 'governance_vote'
  | 'expansion_milestone'
  | 'ai_recommendation'
  | 'report_generated'
  | 'system_alert';

export type EventCategory =
  | 'partner'
  | 'integration'
  | 'liquidity'
  | 'custody'
  | 'treasury'
  | 'compliance'
  | 'risk'
  | 'governance'
  | 'expansion'
  | 'ai'
  | 'reporting'
  | 'system';

export interface AffectedEntity {
  type: string;
  id: string;
  name?: string;
  impact: 'direct' | 'indirect';
}

export type InstitutionalNetworkEventCallback = (event: InstitutionalNetworkEvent) => void;

// ============================================================================
// Configuration Types
// ============================================================================

export interface InstitutionalNetworkConfig {
  enabled: boolean;
  partnerRegistry: PartnerRegistryConfig;
  custodyInfrastructure: CustodyInfrastructureConfig;
  liquidityNetwork: LiquidityNetworkConfig;
  treasuryInteroperability: TreasuryInteropConfig;
  onboarding: OnboardingConfig;
  reporting: InstitutionalReportingConfig;
  expansion: ExpansionConfig;
  aiAdvantage: AIAdvantageConfig;
  governance: InstitutionalGovernanceConfig;
}

export interface PartnerRegistryConfig {
  enabled: boolean;
  autoSync: boolean;
  syncFrequency: string;
  validationRules: string[];
  notificationSettings: NotificationSettings;
}

export interface NotificationSettings {
  enabled: boolean;
  channels: ('email' | 'webhook' | 'slack' | 'telegram')[];
  events: string[];
  recipients: string[];
}

export interface CustodyInfrastructureConfig {
  enabled: boolean;
  defaultProvider: CustodyProvider;
  defaultSecurityLevel: CustodySecurityLevel;
  insuranceRequired: boolean;
  minInsuranceCoverage: string;
  auditFrequency: string;
}

export interface LiquidityNetworkConfig {
  enabled: boolean;
  aggregationEnabled: boolean;
  defaultRoutingStrategy: string;
  maxSlippage: number;
  minLiquidityThreshold: string;
  healthCheckInterval: number;
}

export interface TreasuryInteropConfig {
  enabled: boolean;
  supportedChains: string[];
  automationEnabled: boolean;
  maxAutomationLevel: string;
  defaultRebalanceThreshold: number;
}

export interface OnboardingConfig {
  enabled: boolean;
  defaultWorkflow: string;
  dueDiligenceLevel: string;
  autoApprovalEnabled: boolean;
  autoApprovalThreshold: number;
  timeoutDays: number;
}

export interface InstitutionalReportingConfig {
  enabled: boolean;
  defaultFrequency: string;
  defaultFormat: string;
  retentionDays: number;
  autoGenerate: boolean;
}

export interface ExpansionConfig {
  enabled: boolean;
  priorityRegions: GeographicRegion[];
  targetPartnerTypes: InstitutionalPartnerType[];
  budgetAllocation: string;
}

export interface AIAdvantageConfig {
  enabled: boolean;
  provider: string;
  modelId: string;
  riskModelingEnabled: boolean;
  allocationOptimizationEnabled: boolean;
  anomalyDetectionEnabled: boolean;
  complianceMonitoringEnabled: boolean;
}

export interface InstitutionalGovernanceConfig {
  enabled: boolean;
  advisoryBoardEnabled: boolean;
  committeesEnabled: boolean;
  votingEnabled: boolean;
  policyManagementEnabled: boolean;
}
