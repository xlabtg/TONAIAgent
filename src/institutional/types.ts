/**
 * TONAIAgent - Institutional & Compliance Layer Type Definitions
 *
 * Core types for institutional-grade compliance, risk, and reporting infrastructure.
 * Supports regulated entities, funds, DAOs, and enterprises.
 */

// ============================================================================
// Institutional Account Types
// ============================================================================

export type InstitutionalRole =
  | 'admin'
  | 'trader'
  | 'risk_manager'
  | 'compliance_officer'
  | 'auditor'
  | 'viewer';

export type InstitutionalAccountType =
  | 'hedge_fund'
  | 'family_office'
  | 'crypto_fund'
  | 'fintech'
  | 'asset_manager'
  | 'dao'
  | 'enterprise'
  | 'other';

export interface InstitutionalAccount {
  id: string;
  name: string;
  type: InstitutionalAccountType;
  status: AccountStatus;
  organizationId: string;
  hierarchy: OrganizationHierarchy;
  members: InstitutionalMember[];
  permissions: InstitutionalPermissions;
  compliance: ComplianceStatus;
  onboardingStatus: OnboardingStatus;
  limits: InstitutionalLimits;
  settings: InstitutionalSettings;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export type AccountStatus =
  | 'pending_verification'
  | 'active'
  | 'suspended'
  | 'restricted'
  | 'closed';

export interface OrganizationHierarchy {
  parentAccountId?: string;
  childAccountIds: string[];
  level: number;
  department?: string;
  region?: string;
}

export interface InstitutionalMember {
  id: string;
  userId: string;
  accountId: string;
  role: InstitutionalRole;
  email: string;
  name: string;
  permissions: MemberPermissions;
  status: MemberStatus;
  mfaEnabled: boolean;
  lastLogin?: Date;
  invitedBy: string;
  joinedAt: Date;
  metadata: Record<string, unknown>;
}

export type MemberStatus = 'pending' | 'active' | 'suspended' | 'removed';

export interface MemberPermissions {
  canTrade: boolean;
  canTransfer: boolean;
  canViewReports: boolean;
  canManageMembers: boolean;
  canManageSettings: boolean;
  canApproveTransactions: boolean;
  canAccessAuditLogs: boolean;
  maxTransactionAmount?: number;
  approvalThreshold?: number;
  customPermissions: string[];
}

export interface InstitutionalPermissions {
  tradingEnabled: boolean;
  transfersEnabled: boolean;
  stakingEnabled: boolean;
  defiEnabled: boolean;
  nftEnabled: boolean;
  apiAccessEnabled: boolean;
  whitelistRequired: boolean;
  approvalWorkflowEnabled: boolean;
  multiSigRequired: boolean;
  multiSigThreshold: number;
}

// ============================================================================
// KYC/AML Types
// ============================================================================

export type KycStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'expired';

export type KycLevel = 'basic' | 'standard' | 'enhanced' | 'institutional';

export interface KycProfile {
  id: string;
  accountId: string;
  status: KycStatus;
  level: KycLevel;
  provider: string;
  verificationDate?: Date;
  expirationDate?: Date;
  documents: KycDocument[];
  riskScore: number;
  riskLevel: RiskClassification;
  sanctions: SanctionsCheckResult;
  pep: PepCheckResult;
  adverseMedia: AdverseMediaResult;
  lastReviewDate?: Date;
  nextReviewDate?: Date;
  metadata: Record<string, unknown>;
}

export interface KycDocument {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  uploadedAt: Date;
  verifiedAt?: Date;
  expiresAt?: Date;
  hash: string;
  metadata: Record<string, unknown>;
}

export type DocumentType =
  | 'government_id'
  | 'passport'
  | 'proof_of_address'
  | 'articles_of_incorporation'
  | 'certificate_of_good_standing'
  | 'beneficial_ownership'
  | 'financial_statements'
  | 'source_of_funds'
  | 'tax_identification'
  | 'power_of_attorney'
  | 'board_resolution'
  | 'other';

export type DocumentStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export type RiskClassification = 'low' | 'medium' | 'high' | 'prohibited';

export interface SanctionsCheckResult {
  screened: boolean;
  screenedAt?: Date;
  provider: string;
  matched: boolean;
  matches: SanctionsMatch[];
  nextScreeningDate?: Date;
}

export interface SanctionsMatch {
  listName: string;
  matchScore: number;
  entityName: string;
  entityType: string;
  jurisdiction: string;
  details: string;
  status: 'pending_review' | 'cleared' | 'confirmed';
}

export interface PepCheckResult {
  screened: boolean;
  screenedAt?: Date;
  isPep: boolean;
  pepType?: string;
  pepLevel?: number;
  country?: string;
  position?: string;
  details?: string;
}

export interface AdverseMediaResult {
  screened: boolean;
  screenedAt?: Date;
  articlesFound: number;
  riskIndicators: string[];
  summary?: string;
}

// ============================================================================
// Transaction Monitoring Types
// ============================================================================

export interface TransactionMonitor {
  id: string;
  accountId: string;
  enabled: boolean;
  rules: MonitoringRule[];
  alerts: TransactionAlert[];
  statistics: MonitoringStatistics;
  config: MonitoringConfig;
}

export interface MonitoringRule {
  id: string;
  name: string;
  description: string;
  type: RuleType;
  conditions: RuleCondition[];
  action: RuleAction;
  priority: number;
  enabled: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type RuleType =
  | 'amount_threshold'
  | 'velocity'
  | 'destination_screening'
  | 'pattern_detection'
  | 'behavioral_anomaly'
  | 'jurisdiction_risk'
  | 'time_based'
  | 'custom';

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
  logic?: 'and' | 'or';
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equals'
  | 'less_than_or_equals'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in'
  | 'matches_regex';

export type RuleAction =
  | 'flag'
  | 'alert'
  | 'block'
  | 'require_approval'
  | 'escalate'
  | 'log_only';

export interface TransactionAlert {
  id: string;
  accountId: string;
  transactionId: string;
  ruleId: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  description: string;
  details: Record<string, unknown>;
  assignedTo?: string;
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  resolution?: string;
  resolutionNotes?: string;
}

export type AlertType =
  | 'suspicious_activity'
  | 'threshold_breach'
  | 'pattern_match'
  | 'high_risk_jurisdiction'
  | 'sanctions_match'
  | 'velocity_anomaly'
  | 'behavioral_deviation';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertStatus =
  | 'open'
  | 'under_review'
  | 'escalated'
  | 'resolved'
  | 'false_positive'
  | 'sar_filed';

export interface MonitoringStatistics {
  totalTransactions: number;
  flaggedTransactions: number;
  alertsGenerated: number;
  alertsResolved: number;
  sarsFiled: number;
  avgResolutionTime: number;
  riskDistribution: Record<string, number>;
  lastUpdated: Date;
}

export interface MonitoringConfig {
  realTimeMonitoring: boolean;
  batchProcessingInterval: number;
  alertNotifications: AlertNotificationConfig;
  escalationPolicy: EscalationPolicy;
  retentionDays: number;
}

export interface AlertNotificationConfig {
  email: boolean;
  webhook: boolean;
  slack?: string;
  telegram?: string;
  recipients: string[];
}

export interface EscalationPolicy {
  enabled: boolean;
  levels: EscalationLevel[];
}

export interface EscalationLevel {
  level: number;
  triggerAfterMinutes: number;
  notifyRoles: InstitutionalRole[];
  autoEscalate: boolean;
}

// ============================================================================
// Approval Workflow Types
// ============================================================================

export interface ApprovalWorkflow {
  id: string;
  accountId: string;
  name: string;
  description: string;
  triggerConditions: WorkflowTrigger[];
  steps: ApprovalStep[];
  status: WorkflowStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTrigger {
  type: TriggerType;
  conditions: RuleCondition[];
}

export type TriggerType =
  | 'transaction_amount'
  | 'destination_type'
  | 'asset_type'
  | 'operation_type'
  | 'time_based'
  | 'risk_score'
  | 'custom';

export interface ApprovalStep {
  stepNumber: number;
  name: string;
  approverRoles: InstitutionalRole[];
  approverUsers?: string[];
  requiredApprovals: number;
  timeoutHours: number;
  escalateOnTimeout: boolean;
  escalateTo?: InstitutionalRole;
}

export type WorkflowStatus = 'active' | 'paused' | 'draft' | 'archived';

export interface ApprovalRequest {
  id: string;
  workflowId: string;
  accountId: string;
  transactionId: string;
  currentStep: number;
  status: ApprovalRequestStatus;
  requestedBy: string;
  requestedAt: Date;
  approvals: ApprovalDecision[];
  expiresAt: Date;
  completedAt?: Date;
  metadata: Record<string, unknown>;
}

export type ApprovalRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export interface ApprovalDecision {
  stepNumber: number;
  approverId: string;
  approverRole: InstitutionalRole;
  decision: 'approved' | 'rejected';
  timestamp: Date;
  comments?: string;
  signature?: string;
}

// ============================================================================
// Reporting Types
// ============================================================================

export interface ReportingConfig {
  accountId: string;
  enabled: boolean;
  schedules: ReportSchedule[];
  destinations: ReportDestination[];
  templates: ReportTemplate[];
  retentionDays: number;
}

export interface ReportSchedule {
  id: string;
  reportType: InstitutionalReportType;
  frequency: ReportFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour: number;
  timezone: string;
  enabled: boolean;
  recipients: string[];
  lastRunAt?: Date;
  nextRunAt?: Date;
}

export type InstitutionalReportType =
  | 'performance'
  | 'exposure'
  | 'risk_metrics'
  | 'compliance_summary'
  | 'transaction_audit'
  | 'portfolio_summary'
  | 'sar_report'
  | 'custom';

export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'on_demand';

export interface ReportDestination {
  type: 'email' | 'sftp' | 'api' | 's3' | 'webhook';
  config: Record<string, string>;
  enabled: boolean;
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: InstitutionalReportType;
  sections: ReportSectionConfig[];
  format: ReportFormat;
  branding: ReportBranding;
}

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';

export interface ReportSectionConfig {
  name: string;
  type: string;
  dataSource: string;
  filters?: Record<string, unknown>;
  columns?: string[];
  chartType?: string;
  options?: Record<string, unknown>;
}

export interface ReportBranding {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  footer?: string;
}

export interface InstitutionalReport {
  id: string;
  accountId: string;
  type: InstitutionalReportType;
  title: string;
  generatedAt: Date;
  period: ReportPeriod;
  sections: InstitutionalReportSection[];
  summary: ReportExecutiveSummary;
  metadata: Record<string, unknown>;
  fileUrl?: string;
  expiresAt?: Date;
}

export interface ReportPeriod {
  start: Date;
  end: Date;
  timezone: string;
}

export interface InstitutionalReportSection {
  title: string;
  type: string;
  data: Record<string, unknown>[];
  charts?: ChartConfig[];
  summary?: string;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title: string;
  xAxis: string;
  yAxis: string | string[];
  data: unknown[];
}

export interface ReportExecutiveSummary {
  highlights: string[];
  keyMetrics: KeyMetric[];
  alerts: string[];
  recommendations: string[];
}

export interface KeyMetric {
  name: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease';
  trend?: 'up' | 'down' | 'stable';
}

// ============================================================================
// Risk Management Types
// ============================================================================

export interface InstitutionalRiskConfig {
  accountId: string;
  enabled: boolean;
  portfolioLimits: PortfolioLimits;
  varConfig: VaRConfig;
  stressTestConfig: StressTestConfig;
  alertThresholds: RiskAlertThresholds;
  realTimeMonitoring: boolean;
}

export interface PortfolioLimits {
  maxPositionSize: number;
  maxConcentration: number;
  maxLeverage: number;
  maxDrawdown: number;
  maxDailyLoss: number;
  maxWeeklyLoss: number;
  maxMonthlyLoss: number;
  sectorLimits?: Record<string, number>;
  assetClassLimits?: Record<string, number>;
}

export interface VaRConfig {
  confidenceLevel: number;
  holdingPeriod: number;
  methodology: VaRMethodology;
  lookbackPeriod: number;
  updateFrequency: string;
}

export type VaRMethodology =
  | 'historical'
  | 'parametric'
  | 'monte_carlo';

export interface StressTestConfig {
  enabled: boolean;
  scenarios: StressScenario[];
  customScenarios: CustomStressScenario[];
  runFrequency: string;
  lastRunAt?: Date;
}

export interface StressScenario {
  id: string;
  name: string;
  type: 'historical' | 'hypothetical';
  description: string;
  marketShocks: MarketShock[];
  enabled: boolean;
}

export interface CustomStressScenario {
  id: string;
  name: string;
  description: string;
  shocks: MarketShock[];
  createdBy: string;
  createdAt: Date;
}

export interface MarketShock {
  asset: string;
  changePercent: number;
  volatilityMultiplier?: number;
  correlationShift?: number;
}

export interface RiskAlertThresholds {
  varBreachPercent: number;
  concentrationBreachPercent: number;
  drawdownWarning: number;
  drawdownCritical: number;
  volatilityMultiplier: number;
}

export interface RiskMetrics {
  accountId: string;
  timestamp: Date;
  portfolioValue: number;
  var: VaRMetric;
  expectedShortfall: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  volatility: number;
  beta: number;
  concentration: ConcentrationMetric[];
  correlations: CorrelationMatrix;
  stressTestResults: StressTestResult[];
}

export interface VaRMetric {
  value: number;
  confidenceLevel: number;
  holdingPeriod: number;
  methodology: VaRMethodology;
  calculatedAt: Date;
}

export interface ConcentrationMetric {
  category: string;
  name: string;
  value: number;
  percentage: number;
  limit: number;
  status: 'within_limit' | 'warning' | 'breach';
}

export interface CorrelationMatrix {
  assets: string[];
  matrix: number[][];
  calculatedAt: Date;
}

export interface StressTestResult {
  scenarioId: string;
  scenarioName: string;
  portfolioImpact: number;
  portfolioImpactPercent: number;
  assetImpacts: AssetImpact[];
  runAt: Date;
}

export interface AssetImpact {
  asset: string;
  currentValue: number;
  stressedValue: number;
  impactPercent: number;
}

// ============================================================================
// AI Governance Types
// ============================================================================

export interface AIGovernanceConfig {
  accountId: string;
  enabled: boolean;
  explainabilityLevel: ExplainabilityLevel;
  decisionLogging: boolean;
  humanOversight: HumanOversightConfig;
  modelConstraints: ModelConstraints;
  safetyGuardrails: SafetyGuardrails;
}

export type ExplainabilityLevel = 'minimal' | 'standard' | 'detailed' | 'full';

export interface HumanOversightConfig {
  requiredForHighRisk: boolean;
  requiredAboveAmount: number;
  requiredForNewStrategies: boolean;
  reviewerRoles: InstitutionalRole[];
}

export interface ModelConstraints {
  allowedModels: string[];
  maxConfidenceThreshold: number;
  minConfidenceThreshold: number;
  maxDecisionsPerHour: number;
  maxPortfolioChangePercent: number;
}

export interface SafetyGuardrails {
  enabled: boolean;
  maxLossPerDecision: number;
  maxConsecutiveLosses: number;
  emergencyStopThreshold: number;
  requiresHumanApproval: boolean;
}

export interface AIDecisionRecord {
  id: string;
  accountId: string;
  agentId: string;
  timestamp: Date;
  decisionType: string;
  input: DecisionInput;
  output: DecisionOutput;
  explanation: DecisionExplanation;
  confidence: number;
  riskAssessment: AIRiskAssessment;
  humanReview?: HumanReviewRecord;
  outcome?: DecisionOutcome;
}

export interface DecisionInput {
  marketData: Record<string, unknown>;
  portfolioState: Record<string, unknown>;
  signals: Signal[];
  constraints: Record<string, unknown>;
}

export interface Signal {
  source: string;
  type: string;
  value: number;
  confidence: number;
  timestamp: Date;
}

export interface DecisionOutput {
  action: string;
  parameters: Record<string, unknown>;
  expectedOutcome: ExpectedOutcome;
  alternatives: AlternativeDecision[];
}

export interface ExpectedOutcome {
  expectedReturn: number;
  expectedRisk: number;
  probability: number;
  timeHorizon: string;
}

export interface AlternativeDecision {
  action: string;
  parameters: Record<string, unknown>;
  expectedOutcome: ExpectedOutcome;
  reasonNotSelected: string;
}

export interface DecisionExplanation {
  summary: string;
  factors: ExplanationFactor[];
  reasoning: string[];
  confidenceBreakdown: Record<string, number>;
  limitations: string[];
}

export interface ExplanationFactor {
  name: string;
  importance: number;
  contribution: number;
  description: string;
}

export interface AIRiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactorAssessment[];
  mitigations: string[];
  recommendations: string[];
}

export interface RiskFactorAssessment {
  factor: string;
  level: 'low' | 'medium' | 'high';
  score: number;
  description: string;
}

export interface HumanReviewRecord {
  reviewerId: string;
  reviewerRole: InstitutionalRole;
  timestamp: Date;
  decision: 'approved' | 'rejected' | 'modified';
  modifications?: Record<string, unknown>;
  comments: string;
}

export interface DecisionOutcome {
  actualResult: Record<string, unknown>;
  returnRealized: number;
  riskRealized: number;
  evaluatedAt: Date;
  performanceScore: number;
}

// ============================================================================
// Onboarding Types
// ============================================================================

export interface OnboardingStatus {
  stage: OnboardingStage;
  completedSteps: string[];
  pendingSteps: string[];
  documents: OnboardingDocument[];
  reviewStatus: 'pending' | 'in_review' | 'approved' | 'rejected';
  reviewer?: string;
  startedAt: Date;
  completedAt?: Date;
  notes?: string;
}

export type OnboardingStage =
  | 'initial_application'
  | 'document_collection'
  | 'kyc_verification'
  | 'compliance_review'
  | 'agreement_signing'
  | 'account_setup'
  | 'completed';

export interface OnboardingDocument {
  type: DocumentType;
  required: boolean;
  status: DocumentStatus;
  uploadedAt?: Date;
  notes?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface InstitutionalLimits {
  dailyTransactionLimit: number;
  weeklyTransactionLimit: number;
  monthlyTransactionLimit: number;
  singleTransactionLimit: number;
  largeTransactionThreshold: number;
  approvalRequiredAbove: number;
}

export interface InstitutionalSettings {
  timezone: string;
  currency: string;
  language: string;
  notifications: NotificationSettings;
  security: SecuritySettings;
  integration: IntegrationSettings;
}

export interface NotificationSettings {
  email: boolean;
  slack: boolean;
  telegram: boolean;
  webhook: boolean;
  alertTypes: string[];
  quietHours?: QuietHours;
}

export interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
  excludeEmergencies: boolean;
}

export interface SecuritySettings {
  mfaRequired: boolean;
  ipWhitelist: string[];
  sessionTimeout: number;
  passwordPolicy: PasswordPolicy;
  apiKeyRotation: number;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecial: boolean;
  expiryDays: number;
  historyCount: number;
}

export interface IntegrationSettings {
  apiEnabled: boolean;
  webhookUrl?: string;
  callbackUrl?: string;
  allowedOrigins: string[];
}

export interface ComplianceStatus {
  kycStatus: KycStatus;
  kycLevel: KycLevel;
  amlStatus: 'compliant' | 'pending_review' | 'restricted';
  sanctionsStatus: 'clear' | 'pending_review' | 'flagged';
  riskRating: RiskClassification;
  lastReviewDate?: Date;
  nextReviewDate?: Date;
  restrictions: string[];
}

// ============================================================================
// Event Types
// ============================================================================

export interface InstitutionalEvent {
  id: string;
  timestamp: Date;
  type: InstitutionalEventType;
  accountId: string;
  actorId: string;
  actorRole: InstitutionalRole;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export type InstitutionalEventType =
  | 'account_created'
  | 'account_updated'
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'kyc_status_changed'
  | 'approval_requested'
  | 'approval_decision'
  | 'alert_generated'
  | 'alert_resolved'
  | 'report_generated'
  | 'risk_limit_breach'
  | 'ai_decision_made'
  | 'ai_decision_reviewed'
  | 'settings_updated'
  | 'compliance_review';

export type InstitutionalEventCallback = (event: InstitutionalEvent) => void;
