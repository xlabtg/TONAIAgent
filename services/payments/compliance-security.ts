/**
 * TONAIAgent - Compliance and Security Module
 *
 * Comprehensive compliance framework with KYC/AML verification, fraud detection,
 * transaction monitoring, policy enforcement, and security controls.
 */

import {
  ComplianceLevel,
  ComplianceCheckType,
  ComplianceFlag,
  PaymentRestriction,
  FraudRule,
  FraudThresholds,
  FraudAction,
  FraudAssessment,
  FraudSignal,
  Payment,
  SecurityConfig,
  PaymentsEventCallback,
} from './types';

// ============================================================================
// Compliance and Security Interface
// ============================================================================

export interface ComplianceSecurityManager {
  readonly securityConfig: SecurityConfig;

  // KYC/AML
  initiateKYC(params: KYCParams): Promise<KYCSession>;
  submitKYCDocuments(sessionId: string, documents: KYCDocument[]): Promise<KYCResult>;
  getKYCStatus(userId: string): Promise<KYCStatus>;
  updateKYCLevel(userId: string, level: ComplianceLevel): Promise<void>;

  // Compliance checks
  runComplianceCheck(payment: Payment): Promise<ComplianceCheckResult>;
  runAMLScreening(params: AMLScreeningParams): Promise<AMLResult>;
  runSanctionsCheck(params: SanctionsParams): Promise<SanctionsResult>;
  checkVelocity(userId: string, amount: string): Promise<VelocityCheckResult>;

  // Fraud detection
  assessFraudRisk(payment: Payment): Promise<FraudAssessment>;
  evaluateFraudRules(payment: Payment): Promise<RuleEvaluationResult[]>;
  updateFraudRules(rules: FraudRule[]): Promise<void>;
  getFraudMetrics(): Promise<FraudMetrics>;

  // Transaction monitoring
  monitorTransaction(payment: Payment): Promise<MonitoringResult>;
  flagTransaction(paymentId: string, flag: TransactionFlag): Promise<void>;
  reviewTransaction(paymentId: string, decision: ReviewDecision): Promise<ReviewResult>;
  getMonitoringAlerts(): Promise<MonitoringAlert[]>;

  // Policy management
  createPolicy(policy: PolicyParams): Promise<CompliancePolicy>;
  updatePolicy(policyId: string, updates: Partial<CompliancePolicy>): Promise<CompliancePolicy>;
  deletePolicy(policyId: string): Promise<void>;
  listPolicies(filters?: PolicyFilters): Promise<CompliancePolicy[]>;
  evaluatePolicy(payment: Payment, policyId: string): Promise<PolicyEvaluationResult>;

  // Restrictions
  addRestriction(userId: string, restriction: PaymentRestriction): Promise<void>;
  removeRestriction(userId: string, restrictionId: string): Promise<void>;
  getRestrictions(userId: string): Promise<PaymentRestriction[]>;
  checkRestrictions(userId: string, payment: Payment): Promise<RestrictionCheckResult>;

  // Risk management
  calculateRiskScore(params: RiskScoreParams): Promise<RiskScore>;
  getRiskProfile(userId: string): Promise<RiskProfile>;
  updateRiskThresholds(thresholds: Partial<FraudThresholds>): Promise<void>;

  // Audit and reporting
  getComplianceReport(period: ComplianceReportPeriod): Promise<ComplianceReport>;
  getAuditTrail(filters: AuditFilters): Promise<AuditEntry[]>;
  exportComplianceData(params: ExportParams): Promise<ExportResult>;

  // Events
  onEvent(callback: PaymentsEventCallback): void;
}

// ============================================================================
// Parameter Types
// ============================================================================

export interface KYCParams {
  userId: string;
  level: ComplianceLevel;
  userType: 'individual' | 'business';
  countryCode: string;
  email?: string;
  phone?: string;
}

export interface KYCDocument {
  type: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement' | 'business_registration';
  documentId: string;
  frontImage?: string;
  backImage?: string;
  documentNumber?: string;
  expiryDate?: Date;
  issuingCountry?: string;
}

export interface AMLScreeningParams {
  userId: string;
  fullName: string;
  dateOfBirth?: Date;
  nationality?: string;
  address?: string;
}

export interface SanctionsParams {
  userId?: string;
  walletAddress?: string;
  name?: string;
  country?: string;
}

export interface PolicyParams {
  name: string;
  description: string;
  type: PolicyType;
  rules: PolicyRule[];
  actions: PolicyAction[];
  enabled: boolean;
  priority: number;
}

export type PolicyType =
  | 'amount_limit'
  | 'velocity'
  | 'geographic'
  | 'time_based'
  | 'merchant_category'
  | 'risk_based'
  | 'custom';

export interface PolicyRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'contains';
  value: unknown;
  logicalOperator?: 'and' | 'or';
}

export interface PolicyAction {
  type: 'block' | 'flag' | 'require_approval' | 'require_verification' | 'notify' | 'log';
  parameters?: Record<string, unknown>;
}

export interface PolicyFilters {
  type?: PolicyType;
  enabled?: boolean;
  search?: string;
}

export interface RiskScoreParams {
  userId: string;
  payment?: Payment;
  factors?: string[];
}

export interface AuditFilters {
  userId?: string;
  action?: string;
  fromDate?: Date;
  toDate?: Date;
  severity?: string;
  limit?: number;
  offset?: number;
}

export interface ExportParams {
  type: 'audit' | 'transactions' | 'alerts' | 'full';
  fromDate: Date;
  toDate: Date;
  format: 'json' | 'csv' | 'pdf';
}

export type ComplianceReportPeriod = 'week' | 'month' | 'quarter' | 'year';

export interface TransactionFlag {
  type: 'suspicious' | 'high_risk' | 'potential_fraud' | 'unusual_pattern' | 'manual_review';
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, unknown>;
}

export interface ReviewDecision {
  action: 'approve' | 'reject' | 'escalate' | 'block_user';
  reason: string;
  notes?: string;
  reviewerId: string;
}

// ============================================================================
// Result Types
// ============================================================================

export interface KYCSession {
  id: string;
  userId: string;
  level: ComplianceLevel;
  status: 'pending' | 'documents_required' | 'under_review' | 'approved' | 'rejected';
  requiredDocuments: string[];
  submittedDocuments: string[];
  verificationUrl?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface KYCResult {
  sessionId: string;
  status: 'pending' | 'approved' | 'rejected' | 'requires_more_info';
  level: ComplianceLevel;
  verificationScore?: number;
  issues?: KYCIssue[];
  nextSteps?: string[];
}

export interface KYCIssue {
  type: string;
  severity: 'warning' | 'error';
  message: string;
  field?: string;
  resolution?: string;
}

export interface KYCStatus {
  userId: string;
  level: ComplianceLevel;
  status: 'none' | 'pending' | 'verified' | 'expired' | 'rejected';
  verifiedAt?: Date;
  expiresAt?: Date;
  restrictions?: string[];
  limits?: {
    dailyLimit: string;
    monthlyLimit: string;
    singleTransactionLimit: string;
  };
}

export interface ComplianceCheckResult {
  paymentId: string;
  passed: boolean;
  checks: {
    type: ComplianceCheckType;
    passed: boolean;
    score?: number;
    details?: string;
  }[];
  overallScore: number;
  flags: ComplianceFlag[];
  requiredActions: string[];
  canProceed: boolean;
}

export interface AMLResult {
  userId: string;
  screeningId: string;
  status: 'clear' | 'match_found' | 'potential_match' | 'error';
  matches: AMLMatch[];
  riskLevel: 'low' | 'medium' | 'high';
  lastScreenedAt: Date;
  nextScreeningAt: Date;
}

export interface AMLMatch {
  type: 'pep' | 'sanctions' | 'adverse_media' | 'watchlist';
  name: string;
  matchScore: number;
  source: string;
  details: Record<string, unknown>;
}

export interface SanctionsResult {
  checked: boolean;
  clear: boolean;
  matches: SanctionsMatch[];
  lists: string[];
  timestamp: Date;
}

export interface SanctionsMatch {
  list: string;
  entity: string;
  matchType: 'exact' | 'partial' | 'fuzzy';
  score: number;
  details: Record<string, unknown>;
}

export interface VelocityCheckResult {
  userId: string;
  passed: boolean;
  currentAmount: string;
  periodLimit: string;
  periodType: 'hour' | 'day' | 'week' | 'month';
  utilizationPercent: number;
  remainingAmount: string;
  violations?: VelocityViolation[];
}

export interface VelocityViolation {
  type: 'amount' | 'count' | 'frequency';
  limit: string | number;
  actual: string | number;
  period: string;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  score: number;
  signals: FraudSignal[];
  action?: FraudAction;
}

export interface FraudMetrics {
  period: string;
  totalTransactions: number;
  flaggedTransactions: number;
  blockedTransactions: number;
  falsePositiveRate: number;
  truePositiveRate: number;
  avgFraudScore: number;
  topSignals: { signal: string; count: number }[];
  rulePerformance: { ruleId: string; triggers: number; accuracy: number }[];
}

export interface MonitoringResult {
  paymentId: string;
  status: 'clear' | 'flagged' | 'blocked' | 'requires_review';
  riskScore: number;
  signals: FraudSignal[];
  alerts: MonitoringAlert[];
  actions: string[];
}

export interface MonitoringAlert {
  id: string;
  paymentId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data: Record<string, unknown>;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: Date;
  assignedTo?: string;
}

export interface ReviewResult {
  paymentId: string;
  decision: ReviewDecision['action'];
  reviewerId: string;
  reviewedAt: Date;
  outcome: string;
  notes?: string;
}

export interface CompliancePolicy {
  id: string;
  name: string;
  description: string;
  type: PolicyType;
  rules: PolicyRule[];
  actions: PolicyAction[];
  enabled: boolean;
  priority: number;
  triggerCount: number;
  lastTriggeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyEvaluationResult {
  policyId: string;
  policyName: string;
  triggered: boolean;
  matchedRules: string[];
  actions: PolicyAction[];
  details: Record<string, unknown>;
}

export interface RestrictionCheckResult {
  allowed: boolean;
  violations: {
    restrictionId: string;
    type: PaymentRestriction['type'];
    message: string;
  }[];
  recommendations?: string[];
}

export interface RiskScore {
  userId: string;
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    name: string;
    score: number;
    weight: number;
    impact: 'positive' | 'negative' | 'neutral';
  }[];
  trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
}

export interface RiskProfile {
  userId: string;
  overallScore: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  history: {
    date: Date;
    score: number;
    event?: string;
  }[];
  limits: {
    type: string;
    limit: string;
    used: string;
    remaining: string;
  }[];
  flags: ComplianceFlag[];
  lastAssessmentAt: Date;
  nextAssessmentAt: Date;
}

export interface RiskFactor {
  name: string;
  category: 'identity' | 'behavior' | 'transaction' | 'external';
  score: number;
  weight: number;
  details: string;
  trend: 'improving' | 'stable' | 'declining';
}

export interface ComplianceReport {
  period: ComplianceReportPeriod;
  startDate: Date;
  endDate: Date;
  summary: {
    totalTransactions: number;
    flaggedTransactions: number;
    blockedTransactions: number;
    reviewedTransactions: number;
    approvalRate: number;
    avgProcessingTime: number;
  };
  kycMetrics: {
    newVerifications: number;
    approvedVerifications: number;
    rejectedVerifications: number;
    pendingVerifications: number;
    expiringVerifications: number;
  };
  amlMetrics: {
    screeningsPerformed: number;
    matchesFound: number;
    clearedMatches: number;
    escalatedMatches: number;
  };
  fraudMetrics: {
    detectedFraud: number;
    preventedLoss: string;
    falsePositives: number;
    avgFraudScore: number;
  };
  policyMetrics: {
    policyTriggered: { policyId: string; count: number }[];
    topViolations: { type: string; count: number }[];
  };
  recommendations: string[];
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  ipAddress?: string;
  userAgent?: string;
  outcome: 'success' | 'failure';
}

export interface ExportResult {
  id: string;
  type: ExportParams['type'];
  format: ExportParams['format'];
  status: 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  recordCount?: number;
  fileSize?: number;
  expiresAt?: Date;
  createdAt: Date;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultComplianceSecurityManager implements ComplianceSecurityManager {
  readonly securityConfig: SecurityConfig;

  private kycSessions: Map<string, KYCSession> = new Map();
  private kycStatuses: Map<string, KYCStatus> = new Map();
  private policies: Map<string, CompliancePolicy> = new Map();
  private restrictions: Map<string, PaymentRestriction[]> = new Map();
  private alerts: MonitoringAlert[] = [];
  private auditLog: AuditEntry[] = [];
  private eventCallbacks: PaymentsEventCallback[] = [];

  private fraudRules: FraudRule[] = [];
  private fraudThresholds: FraudThresholds;

  constructor(config?: Partial<SecurityConfig>) {
    this.securityConfig = {
      fraudDetection: true,
      mlFraudScoring: true,
      velocityChecking: true,
      deviceFingerprinting: true,
      challengeThreshold: 70,
      autoBlockThreshold: 90,
      ...config,
    };

    this.fraudThresholds = {
      highRisk: 70,
      mediumRisk: 40,
      lowRisk: 20,
      autoBlock: this.securityConfig.autoBlockThreshold,
      autoApprove: 20,
    };

    // Initialize default fraud rules
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    this.fraudRules = [
      {
        id: 'rule_velocity',
        name: 'High Velocity',
        type: 'velocity',
        condition: { type: 'frequency', operator: 'greater_than', value: 10 },
        action: 'flag',
        score: 30,
        enabled: true,
      },
      {
        id: 'rule_amount',
        name: 'Large Amount',
        type: 'amount',
        condition: { type: 'amount', operator: 'greater_than', value: '10000' },
        action: 'review',
        score: 25,
        enabled: true,
      },
      {
        id: 'rule_new_recipient',
        name: 'New Recipient',
        type: 'pattern',
        condition: { type: 'category', operator: 'equals', value: 'new_recipient' },
        action: 'flag',
        score: 15,
        enabled: true,
      },
    ];
  }

  // ============================================================================
  // KYC/AML
  // ============================================================================

  async initiateKYC(params: KYCParams): Promise<KYCSession> {
    const sessionId = this.generateId('kyc');
    const now = new Date();

    const requiredDocuments = this.getRequiredDocuments(params.level, params.userType);

    const session: KYCSession = {
      id: sessionId,
      userId: params.userId,
      level: params.level,
      status: 'documents_required',
      requiredDocuments,
      submittedDocuments: [],
      verificationUrl: `https://verify.tonaiagent.com/kyc/${sessionId}`,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      createdAt: now,
    };

    this.kycSessions.set(sessionId, session);
    this.logAudit('kyc_initiated', 'kyc_session', sessionId, params.userId, { level: params.level });

    return session;
  }

  async submitKYCDocuments(sessionId: string, documents: KYCDocument[]): Promise<KYCResult> {
    const session = this.kycSessions.get(sessionId);
    if (!session) {
      throw new Error(`KYC session not found: ${sessionId}`);
    }

    session.submittedDocuments = documents.map(d => d.type);
    session.status = 'under_review';

    // Simulate verification
    const verificationScore = 70 + Math.random() * 30;
    const passed = verificationScore >= 80;

    const issues: KYCIssue[] = [];
    if (!passed) {
      issues.push({
        type: 'verification_failed',
        severity: 'warning',
        message: 'Document verification could not be completed',
        resolution: 'Please submit clearer images',
      });
    }

    if (passed) {
      session.status = 'approved';

      // Update KYC status
      this.kycStatuses.set(session.userId, {
        userId: session.userId,
        level: session.level,
        status: 'verified',
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        limits: this.getLimitsForLevel(session.level),
      });
    } else {
      session.status = 'rejected';
    }

    this.logAudit('kyc_documents_submitted', 'kyc_session', sessionId, session.userId, {
      documentsCount: documents.length,
      result: passed ? 'approved' : 'rejected',
    });

    return {
      sessionId,
      status: passed ? 'approved' : 'rejected',
      level: session.level,
      verificationScore,
      issues,
      nextSteps: passed ? undefined : ['Submit clearer document images'],
    };
  }

  async getKYCStatus(userId: string): Promise<KYCStatus> {
    return this.kycStatuses.get(userId) || {
      userId,
      level: 'none',
      status: 'none',
      limits: this.getLimitsForLevel('none'),
    };
  }

  async updateKYCLevel(userId: string, level: ComplianceLevel): Promise<void> {
    const status = await this.getKYCStatus(userId);
    status.level = level;
    status.limits = this.getLimitsForLevel(level);
    this.kycStatuses.set(userId, status);

    this.logAudit('kyc_level_updated', 'user', userId, undefined, { newLevel: level });
  }

  // ============================================================================
  // Compliance Checks
  // ============================================================================

  async runComplianceCheck(payment: Payment): Promise<ComplianceCheckResult> {
    const checks: ComplianceCheckResult['checks'] = [];
    const flags: ComplianceFlag[] = [];
    let overallScore = 100;

    // KYC verification check
    const kycStatus = await this.getKYCStatus(payment.sender.id);
    const kycPassed = kycStatus.status === 'verified';
    checks.push({
      type: 'kyc_verified',
      passed: kycPassed,
      score: kycPassed ? 100 : 0,
      details: kycPassed ? 'KYC verified' : 'KYC not completed',
    });
    if (!kycPassed) {
      overallScore -= 30;
      flags.push({
        type: 'kyc_required',
        severity: 'high',
        message: 'KYC verification required',
        action: 'block',
        raisedAt: new Date(),
      });
    }

    // AML screening
    const amlResult = await this.runAMLScreening({
      userId: payment.sender.id,
      fullName: payment.sender.name || '',
    });
    const amlPassed = amlResult.status === 'clear';
    checks.push({
      type: 'aml_screening',
      passed: amlPassed,
      score: amlPassed ? 100 : 0,
      details: amlPassed ? 'AML screening clear' : `${amlResult.matches.length} potential matches found`,
    });
    if (!amlPassed) {
      overallScore -= 40;
      flags.push({
        type: 'aml_match',
        severity: 'critical',
        message: 'AML screening found potential matches',
        action: 'escalate',
        raisedAt: new Date(),
      });
    }

    // Velocity check
    if (this.securityConfig.velocityChecking) {
      const velocityResult = await this.checkVelocity(payment.sender.id, payment.amount);
      checks.push({
        type: 'velocity_check',
        passed: velocityResult.passed,
        score: velocityResult.passed ? 100 : 50,
        details: velocityResult.passed
          ? 'Within velocity limits'
          : `Velocity limit exceeded: ${velocityResult.utilizationPercent}% utilized`,
      });
      if (!velocityResult.passed) {
        overallScore -= 20;
        flags.push({
          type: 'velocity_exceeded',
          severity: 'medium',
          message: 'Transaction velocity limit exceeded',
          action: 'review',
          raisedAt: new Date(),
        });
      }
    }

    // Amount limit check
    const amountBigInt = BigInt(payment.amount);
    const limitCheck = kycStatus.limits
      ? BigInt(payment.amount) <= BigInt(kycStatus.limits.singleTransactionLimit)
      : amountBigInt <= BigInt('1000');
    checks.push({
      type: 'amount_limit',
      passed: limitCheck,
      score: limitCheck ? 100 : 0,
      details: limitCheck ? 'Within amount limits' : 'Exceeds transaction limit',
    });
    if (!limitCheck) {
      overallScore -= 25;
      flags.push({
        type: 'amount_exceeded',
        severity: 'high',
        message: 'Transaction amount exceeds limit',
        action: 'block',
        raisedAt: new Date(),
      });
    }

    const passed = overallScore >= 60 && !flags.some(f => f.action === 'block');

    return {
      paymentId: payment.id,
      passed,
      checks,
      overallScore: Math.max(0, overallScore),
      flags,
      requiredActions: flags.map(f => f.message),
      canProceed: passed,
    };
  }

  async runAMLScreening(params: AMLScreeningParams): Promise<AMLResult> {
    const screeningId = this.generateId('aml');

    // Simulate AML screening
    const matches: AMLMatch[] = [];
    const hasMatch = Math.random() > 0.95;

    if (hasMatch) {
      matches.push({
        type: 'watchlist',
        name: 'Similar Name Found',
        matchScore: 0.75,
        source: 'Internal Watchlist',
        details: { reason: 'Name similarity' },
      });
    }

    this.logAudit('aml_screening', 'user', params.userId, undefined, {
      screeningId,
      matchCount: matches.length,
    });

    return {
      userId: params.userId,
      screeningId,
      status: matches.length > 0 ? 'potential_match' : 'clear',
      matches,
      riskLevel: matches.length > 0 ? 'medium' : 'low',
      lastScreenedAt: new Date(),
      nextScreeningAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  async runSanctionsCheck(params: SanctionsParams): Promise<SanctionsResult> {
    // Simulate sanctions check
    const matches: SanctionsMatch[] = [];

    this.logAudit('sanctions_check', 'user', params.userId || 'unknown', undefined, {
      walletAddress: params.walletAddress,
      matchCount: matches.length,
    });

    return {
      checked: true,
      clear: matches.length === 0,
      matches,
      lists: ['OFAC', 'EU', 'UN'],
      timestamp: new Date(),
    };
  }

  async checkVelocity(userId: string, amount: string): Promise<VelocityCheckResult> {
    // Simulate velocity tracking
    const dailyUsed = BigInt(Math.floor(Math.random() * 5000));
    const dailyLimit = BigInt('10000');
    const newTotal = dailyUsed + BigInt(amount);

    const passed = newTotal <= dailyLimit;
    const utilizationPercent = Number((newTotal * BigInt(100)) / dailyLimit);

    return {
      userId,
      passed,
      currentAmount: dailyUsed.toString(),
      periodLimit: dailyLimit.toString(),
      periodType: 'day',
      utilizationPercent,
      remainingAmount: (dailyLimit - dailyUsed).toString(),
      violations: passed ? undefined : [{
        type: 'amount',
        limit: dailyLimit.toString(),
        actual: newTotal.toString(),
        period: 'daily',
      }],
    };
  }

  // ============================================================================
  // Fraud Detection
  // ============================================================================

  async assessFraudRisk(payment: Payment): Promise<FraudAssessment> {
    if (!this.securityConfig.fraudDetection) {
      return {
        paymentId: payment.id,
        score: 0,
        level: 'low',
        signals: [],
        recommendation: 'approve',
        rulesTriggered: [],
        assessedAt: new Date(),
      };
    }

    const signals: FraudSignal[] = [];
    let totalScore = 0;

    // Evaluate all fraud rules
    const ruleResults = await this.evaluateFraudRules(payment);
    const triggeredRules: string[] = [];

    for (const result of ruleResults) {
      if (result.triggered) {
        totalScore += result.score;
        triggeredRules.push(result.ruleId);
        signals.push(...result.signals);
      }
    }

    // Add ML-based scoring if enabled
    if (this.securityConfig.mlFraudScoring) {
      const mlScore = await this.getMLScore(payment);
      totalScore += mlScore.score;
      if (mlScore.signals) {
        signals.push(...mlScore.signals);
      }
    }

    // Determine risk level
    let level: FraudAssessment['level'];
    if (totalScore >= this.fraudThresholds.highRisk) {
      level = 'critical';
    } else if (totalScore >= this.fraudThresholds.mediumRisk) {
      level = 'high';
    } else if (totalScore >= this.fraudThresholds.lowRisk) {
      level = 'medium';
    } else {
      level = 'low';
    }

    // Determine recommendation
    let recommendation: FraudAssessment['recommendation'];
    if (totalScore >= this.fraudThresholds.autoBlock) {
      recommendation = 'decline';
    } else if (totalScore >= this.securityConfig.challengeThreshold) {
      recommendation = 'challenge';
    } else if (totalScore >= this.fraudThresholds.mediumRisk) {
      recommendation = 'review';
    } else {
      recommendation = 'approve';
    }

    this.logAudit('fraud_assessment', 'payment', payment.id, payment.sender.id, {
      score: totalScore,
      level,
      recommendation,
      triggeredRules,
    });

    return {
      paymentId: payment.id,
      score: totalScore,
      level,
      signals,
      recommendation,
      mlScore: this.securityConfig.mlFraudScoring ? totalScore : undefined,
      rulesTriggered: triggeredRules,
      assessedAt: new Date(),
    };
  }

  async evaluateFraudRules(payment: Payment): Promise<RuleEvaluationResult[]> {
    const results: RuleEvaluationResult[] = [];

    for (const rule of this.fraudRules) {
      if (!rule.enabled) continue;

      const signals: FraudSignal[] = [];
      let triggered = false;

      switch (rule.type) {
        case 'velocity':
          triggered = await this.checkVelocityRule(payment);
          if (triggered) {
            signals.push({
              type: 'velocity',
              severity: 'medium',
              description: 'High transaction frequency detected',
              evidence: { transactionsLast24h: 15 },
              score: rule.score,
            });
          }
          break;

        case 'amount':
          triggered = BigInt(payment.amount) > BigInt(rule.condition.value as string);
          if (triggered) {
            signals.push({
              type: 'amount',
              severity: 'medium',
              description: 'Large transaction amount',
              evidence: { amount: payment.amount, threshold: rule.condition.value },
              score: rule.score,
            });
          }
          break;

        case 'pattern':
          triggered = !payment.recipient.verified;
          if (triggered) {
            signals.push({
              type: 'pattern',
              severity: 'low',
              description: 'New or unverified recipient',
              evidence: { recipientVerified: false },
              score: rule.score,
            });
          }
          break;
      }

      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        triggered,
        score: triggered ? rule.score : 0,
        signals,
        action: triggered ? { trigger: 'rule_match', ruleId: rule.id, action: rule.action } : undefined,
      });
    }

    return results;
  }

  async updateFraudRules(rules: FraudRule[]): Promise<void> {
    this.fraudRules = rules;
    this.logAudit('fraud_rules_updated', 'system', 'fraud_rules', undefined, {
      ruleCount: rules.length,
    });
  }

  async getFraudMetrics(): Promise<FraudMetrics> {
    return {
      period: 'month',
      totalTransactions: 10000,
      flaggedTransactions: 150,
      blockedTransactions: 25,
      falsePositiveRate: 0.05,
      truePositiveRate: 0.85,
      avgFraudScore: 15,
      topSignals: [
        { signal: 'velocity', count: 50 },
        { signal: 'amount', count: 35 },
        { signal: 'pattern', count: 30 },
      ],
      rulePerformance: this.fraudRules.map(r => ({
        ruleId: r.id,
        triggers: Math.floor(Math.random() * 100),
        accuracy: 0.8 + Math.random() * 0.15,
      })),
    };
  }

  // ============================================================================
  // Transaction Monitoring
  // ============================================================================

  async monitorTransaction(payment: Payment): Promise<MonitoringResult> {
    const fraudAssessment = await this.assessFraudRisk(payment);
    const complianceResult = await this.runComplianceCheck(payment);

    const alerts: MonitoringAlert[] = [];

    // Create alerts based on fraud assessment
    if (fraudAssessment.level === 'high' || fraudAssessment.level === 'critical') {
      const alert: MonitoringAlert = {
        id: this.generateId('alert'),
        paymentId: payment.id,
        type: 'fraud_risk',
        severity: fraudAssessment.level === 'critical' ? 'critical' : 'high',
        message: `High fraud risk detected: score ${fraudAssessment.score}`,
        data: { fraudAssessment },
        status: 'open',
        createdAt: new Date(),
      };
      alerts.push(alert);
      this.alerts.push(alert);
    }

    // Create alerts based on compliance issues
    for (const flag of complianceResult.flags) {
      if (flag.severity === 'high' || flag.severity === 'critical') {
        const alert: MonitoringAlert = {
          id: this.generateId('alert'),
          paymentId: payment.id,
          type: flag.type,
          severity: flag.severity,
          message: flag.message,
          data: { flag },
          status: 'open',
          createdAt: new Date(),
        };
        alerts.push(alert);
        this.alerts.push(alert);
      }
    }

    let status: MonitoringResult['status'];
    if (fraudAssessment.recommendation === 'decline' || !complianceResult.canProceed) {
      status = 'blocked';
    } else if (fraudAssessment.recommendation === 'review' || alerts.length > 0) {
      status = 'flagged';
    } else if (fraudAssessment.recommendation === 'challenge') {
      status = 'requires_review';
    } else {
      status = 'clear';
    }

    return {
      paymentId: payment.id,
      status,
      riskScore: fraudAssessment.score,
      signals: fraudAssessment.signals,
      alerts,
      actions: alerts.map(a => `Review: ${a.message}`),
    };
  }

  async flagTransaction(paymentId: string, flag: TransactionFlag): Promise<void> {
    const alert: MonitoringAlert = {
      id: this.generateId('alert'),
      paymentId,
      type: flag.type,
      severity: flag.severity,
      message: flag.reason,
      data: flag.details || {},
      status: 'open',
      createdAt: new Date(),
    };

    this.alerts.push(alert);
    this.logAudit('transaction_flagged', 'payment', paymentId, undefined, flag as unknown as Record<string, unknown>);
  }

  async reviewTransaction(paymentId: string, decision: ReviewDecision): Promise<ReviewResult> {
    // Update related alerts
    const relatedAlerts = this.alerts.filter(a => a.paymentId === paymentId);
    for (const alert of relatedAlerts) {
      alert.status = 'resolved';
    }

    this.logAudit('transaction_reviewed', 'payment', paymentId, decision.reviewerId, decision as unknown as Record<string, unknown>);

    return {
      paymentId,
      decision: decision.action,
      reviewerId: decision.reviewerId,
      reviewedAt: new Date(),
      outcome: `Transaction ${decision.action}`,
      notes: decision.notes,
    };
  }

  async getMonitoringAlerts(): Promise<MonitoringAlert[]> {
    return this.alerts.filter(a => a.status === 'open' || a.status === 'investigating');
  }

  // ============================================================================
  // Policy Management
  // ============================================================================

  async createPolicy(params: PolicyParams): Promise<CompliancePolicy> {
    const policyId = this.generateId('pol');
    const now = new Date();

    const policy: CompliancePolicy = {
      id: policyId,
      name: params.name,
      description: params.description,
      type: params.type,
      rules: params.rules,
      actions: params.actions,
      enabled: params.enabled,
      priority: params.priority,
      triggerCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.policies.set(policyId, policy);
    this.logAudit('policy_created', 'policy', policyId, undefined, { name: params.name });

    return policy;
  }

  async updatePolicy(policyId: string, updates: Partial<CompliancePolicy>): Promise<CompliancePolicy> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const { id, createdAt, triggerCount, ...allowedUpdates } = updates;
    Object.assign(policy, allowedUpdates);
    policy.updatedAt = new Date();

    this.logAudit('policy_updated', 'policy', policyId, undefined, updates);

    return policy;
  }

  async deletePolicy(policyId: string): Promise<void> {
    this.policies.delete(policyId);
    this.logAudit('policy_deleted', 'policy', policyId, undefined, {});
  }

  async listPolicies(filters?: PolicyFilters): Promise<CompliancePolicy[]> {
    let policies = Array.from(this.policies.values());

    if (filters) {
      if (filters.type) {
        policies = policies.filter(p => p.type === filters.type);
      }
      if (filters.enabled !== undefined) {
        policies = policies.filter(p => p.enabled === filters.enabled);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        policies = policies.filter(p =>
          p.name.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search)
        );
      }
    }

    return policies.sort((a, b) => a.priority - b.priority);
  }

  async evaluatePolicy(payment: Payment, policyId: string): Promise<PolicyEvaluationResult> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const matchedRules: string[] = [];
    let triggered = false;

    for (const rule of policy.rules) {
      const matches = this.evaluatePolicyRule(payment, rule);
      if (matches) {
        matchedRules.push(`${rule.field} ${rule.operator} ${rule.value}`);
        triggered = true;
      }
    }

    if (triggered) {
      policy.triggerCount++;
      policy.lastTriggeredAt = new Date();
    }

    return {
      policyId,
      policyName: policy.name,
      triggered,
      matchedRules,
      actions: triggered ? policy.actions : [],
      details: { payment: { id: payment.id, amount: payment.amount } },
    };
  }

  // ============================================================================
  // Restrictions
  // ============================================================================

  async addRestriction(userId: string, restriction: PaymentRestriction): Promise<void> {
    const userRestrictions = this.restrictions.get(userId) || [];
    userRestrictions.push(restriction);
    this.restrictions.set(userId, userRestrictions);

    this.logAudit('restriction_added', 'user', userId, undefined, restriction as unknown as Record<string, unknown>);
  }

  async removeRestriction(userId: string, restrictionType: string): Promise<void> {
    const userRestrictions = this.restrictions.get(userId) || [];
    const filtered = userRestrictions.filter(r => r.type !== restrictionType);
    this.restrictions.set(userId, filtered);

    this.logAudit('restriction_removed', 'user', userId, undefined, { type: restrictionType });
  }

  async getRestrictions(userId: string): Promise<PaymentRestriction[]> {
    return this.restrictions.get(userId) || [];
  }

  async checkRestrictions(userId: string, payment: Payment): Promise<RestrictionCheckResult> {
    const userRestrictions = await this.getRestrictions(userId);
    const violations: RestrictionCheckResult['violations'] = [];

    for (const restriction of userRestrictions) {
      // Check if restriction has expired
      if (restriction.expiresAt && restriction.expiresAt < new Date()) {
        continue;
      }

      switch (restriction.type) {
        case 'amount':
          if (BigInt(payment.amount) > BigInt(restriction.value as string)) {
            violations.push({
              restrictionId: `${restriction.type}_${restriction.value}`,
              type: 'amount',
              message: `Amount exceeds limit: ${restriction.reason}`,
            });
          }
          break;

        case 'category':
          // Would check payment category
          break;

        case 'recipient':
          if (payment.recipient.id === restriction.value) {
            violations.push({
              restrictionId: `${restriction.type}_${restriction.value}`,
              type: 'recipient',
              message: `Recipient is restricted: ${restriction.reason}`,
            });
          }
          break;
      }
    }

    return {
      allowed: violations.length === 0,
      violations,
      recommendations: violations.length > 0 ? ['Contact support to review restrictions'] : undefined,
    };
  }

  // ============================================================================
  // Risk Management
  // ============================================================================

  async calculateRiskScore(params: RiskScoreParams): Promise<RiskScore> {
    const factors: RiskScore['factors'] = [];
    let totalScore = 0;

    // KYC factor
    const kycStatus = await this.getKYCStatus(params.userId);
    const kycScore = kycStatus.status === 'verified' ? 10 : 40;
    factors.push({
      name: 'KYC Status',
      score: kycScore,
      weight: 0.3,
      impact: kycScore < 20 ? 'positive' : 'negative',
    });
    totalScore += kycScore * 0.3;

    // Velocity factor
    const velocityResult = await this.checkVelocity(params.userId, params.payment?.amount || '0');
    const velocityScore = velocityResult.passed ? 5 : 35;
    factors.push({
      name: 'Transaction Velocity',
      score: velocityScore,
      weight: 0.25,
      impact: velocityScore < 20 ? 'positive' : 'negative',
    });
    totalScore += velocityScore * 0.25;

    // Account age (simulated)
    const accountAgeScore = 10;
    factors.push({
      name: 'Account Age',
      score: accountAgeScore,
      weight: 0.2,
      impact: 'positive',
    });
    totalScore += accountAgeScore * 0.2;

    // Previous fraud flags
    const fraudHistoryScore = 5;
    factors.push({
      name: 'Fraud History',
      score: fraudHistoryScore,
      weight: 0.25,
      impact: 'positive',
    });
    totalScore += fraudHistoryScore * 0.25;

    const level = totalScore >= 70 ? 'critical' : totalScore >= 50 ? 'high' : totalScore >= 30 ? 'medium' : 'low';

    return {
      userId: params.userId,
      score: Math.round(totalScore),
      level,
      factors,
      trend: 'stable',
      recommendations: level !== 'low' ? ['Complete KYC verification for lower risk score'] : [],
    };
  }

  async getRiskProfile(userId: string): Promise<RiskProfile> {
    const riskScore = await this.calculateRiskScore({ userId });
    const restrictions = await this.getRestrictions(userId);
    const kycStatus = await this.getKYCStatus(userId);

    return {
      userId,
      overallScore: riskScore.score,
      level: riskScore.level,
      factors: riskScore.factors.map(f => ({
        name: f.name,
        category: 'behavior',
        score: f.score,
        weight: f.weight,
        details: `${f.impact} impact on risk score`,
        trend: 'stable',
      })),
      history: [
        { date: new Date(), score: riskScore.score },
      ],
      limits: kycStatus.limits ? [
        { type: 'daily', limit: kycStatus.limits.dailyLimit, used: '0', remaining: kycStatus.limits.dailyLimit },
        { type: 'single', limit: kycStatus.limits.singleTransactionLimit, used: '0', remaining: kycStatus.limits.singleTransactionLimit },
      ] : [],
      flags: restrictions.map(r => ({
        type: r.type,
        severity: 'medium' as const,
        message: r.reason,
        action: 'monitor' as const,
        raisedAt: new Date(),
      })),
      lastAssessmentAt: new Date(),
      nextAssessmentAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  }

  async updateRiskThresholds(thresholds: Partial<FraudThresholds>): Promise<void> {
    Object.assign(this.fraudThresholds, thresholds);
    this.logAudit('risk_thresholds_updated', 'system', 'risk_thresholds', undefined, thresholds);
  }

  // ============================================================================
  // Audit and Reporting
  // ============================================================================

  async getComplianceReport(period: ComplianceReportPeriod): Promise<ComplianceReport> {
    const now = new Date();
    const startDate = this.calculatePeriodStart(now, period);

    return {
      period,
      startDate,
      endDate: now,
      summary: {
        totalTransactions: 10000,
        flaggedTransactions: 150,
        blockedTransactions: 25,
        reviewedTransactions: 100,
        approvalRate: 97.5,
        avgProcessingTime: 2.5,
      },
      kycMetrics: {
        newVerifications: 500,
        approvedVerifications: 450,
        rejectedVerifications: 30,
        pendingVerifications: 20,
        expiringVerifications: 50,
      },
      amlMetrics: {
        screeningsPerformed: 5000,
        matchesFound: 15,
        clearedMatches: 12,
        escalatedMatches: 3,
      },
      fraudMetrics: {
        detectedFraud: 8,
        preventedLoss: '25000',
        falsePositives: 12,
        avgFraudScore: 15,
      },
      policyMetrics: {
        policyTriggered: Array.from(this.policies.values()).map(p => ({
          policyId: p.id,
          count: p.triggerCount,
        })),
        topViolations: [
          { type: 'amount_limit', count: 50 },
          { type: 'velocity', count: 35 },
        ],
      },
      recommendations: [
        'Review and update fraud rules for better accuracy',
        'Consider implementing additional verification for high-risk transactions',
      ],
    };
  }

  async getAuditTrail(filters: AuditFilters): Promise<AuditEntry[]> {
    let entries = [...this.auditLog];

    if (filters.userId) {
      entries = entries.filter(e => e.userId === filters.userId);
    }
    if (filters.action) {
      entries = entries.filter(e => e.action === filters.action);
    }
    if (filters.fromDate) {
      entries = entries.filter(e => e.timestamp >= filters.fromDate!);
    }
    if (filters.toDate) {
      entries = entries.filter(e => e.timestamp <= filters.toDate!);
    }
    if (filters.severity) {
      entries = entries.filter(e => e.severity === filters.severity);
    }

    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const offset = filters.offset || 0;
    const limit = filters.limit || 100;

    return entries.slice(offset, offset + limit);
  }

  async exportComplianceData(params: ExportParams): Promise<ExportResult> {
    const exportId = this.generateId('exp');

    return {
      id: exportId,
      type: params.type,
      format: params.format,
      status: 'completed',
      downloadUrl: `https://exports.tonaiagent.com/compliance/${exportId}.${params.format}`,
      recordCount: this.auditLog.length,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: PaymentsEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getRequiredDocuments(level: ComplianceLevel, userType: 'individual' | 'business'): string[] {
    const docs: string[] = [];

    if (level !== 'none') {
      docs.push('identity');
    }

    if (level === 'standard' || level === 'enhanced' || level === 'full') {
      docs.push('address_proof');
    }

    if (userType === 'business') {
      docs.push('business_registration');
    }

    if (level === 'enhanced' || level === 'full') {
      docs.push('source_of_funds');
    }

    return docs;
  }

  private getLimitsForLevel(level: ComplianceLevel): KYCStatus['limits'] {
    const limits: Record<ComplianceLevel, KYCStatus['limits']> = {
      none: { dailyLimit: '100', monthlyLimit: '500', singleTransactionLimit: '50' },
      basic: { dailyLimit: '1000', monthlyLimit: '5000', singleTransactionLimit: '500' },
      standard: { dailyLimit: '10000', monthlyLimit: '50000', singleTransactionLimit: '5000' },
      enhanced: { dailyLimit: '100000', monthlyLimit: '500000', singleTransactionLimit: '50000' },
      full: { dailyLimit: '1000000', monthlyLimit: '5000000', singleTransactionLimit: '500000' },
    };

    return limits[level];
  }

  private async checkVelocityRule(_payment: Payment): Promise<boolean> {
    // Simulate velocity check
    return Math.random() > 0.9;
  }

  private async getMLScore(_payment: Payment): Promise<{ score: number; signals?: FraudSignal[] }> {
    // Simulate ML fraud scoring
    const score = Math.random() * 20;
    const signals: FraudSignal[] = [];

    if (score > 15) {
      signals.push({
        type: 'ml_anomaly',
        severity: 'medium',
        description: 'ML model detected unusual pattern',
        evidence: { modelScore: score },
        score,
      });
    }

    return { score, signals };
  }

  private evaluatePolicyRule(payment: Payment, rule: PolicyRule): boolean {
    let value: unknown;

    switch (rule.field) {
      case 'amount':
        value = BigInt(payment.amount);
        break;
      case 'currency':
        value = payment.currency;
        break;
      case 'method':
        value = payment.method;
        break;
      case 'recipient.verified':
        value = payment.recipient.verified;
        break;
      default:
        value = undefined;
    }

    switch (rule.operator) {
      case 'equals':
        return value === rule.value;
      case 'not_equals':
        return value !== rule.value;
      case 'greater_than':
        return typeof value === 'bigint' && value > BigInt(rule.value as string);
      case 'less_than':
        return typeof value === 'bigint' && value < BigInt(rule.value as string);
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(value);
      case 'not_in':
        return Array.isArray(rule.value) && !rule.value.includes(value);
      default:
        return false;
    }
  }

  private logAudit(
    action: string,
    resource: string,
    resourceId: string,
    userId?: string,
    details?: Record<string, unknown>
  ): void {
    const entry: AuditEntry = {
      id: this.generateId('audit'),
      timestamp: new Date(),
      userId,
      action,
      resource,
      resourceId,
      details: details || {},
      severity: 'info',
      outcome: 'success',
    };

    this.auditLog.push(entry);

    // Keep only last 10000 entries
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }
  }

  private calculatePeriodStart(now: Date, period: ComplianceReportPeriod): Date {
    const start = new Date(now);

    switch (period) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }

    return start;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createComplianceSecurityManager(config?: Partial<SecurityConfig>): DefaultComplianceSecurityManager {
  return new DefaultComplianceSecurityManager(config);
}
