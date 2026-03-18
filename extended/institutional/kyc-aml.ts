/**
 * TONAIAgent - KYC/AML Integration Layer
 *
 * Implements compliance infrastructure:
 * - Identity verification
 * - Sanctions screening
 * - Transaction monitoring
 * - Suspicious activity alerts
 * - Risk scoring
 */

import {
  KycProfile,
  KycLevel,
  KycDocument,
  DocumentType,
  RiskClassification,
  SanctionsCheckResult,
  PepCheckResult,
  AdverseMediaResult,
  TransactionMonitor,
  MonitoringRule,
  RuleType,
  RuleAction,
  TransactionAlert,
  AlertType,
  AlertSeverity,
  AlertStatus,
  MonitoringStatistics,
  MonitoringConfig,
  InstitutionalEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface KycAmlManager {
  // KYC Profile Management
  createProfile(accountId: string, level?: KycLevel): Promise<KycProfile>;
  getProfile(accountId: string): Promise<KycProfile | null>;
  updateProfile(accountId: string, updates: Partial<KycProfileUpdates>): Promise<KycProfile>;
  submitForReview(accountId: string): Promise<void>;
  approveKyc(accountId: string, approvedBy: string, notes?: string): Promise<void>;
  rejectKyc(accountId: string, rejectedBy: string, reason: string): Promise<void>;

  // Document Management
  uploadDocument(
    accountId: string,
    type: DocumentType,
    hash: string,
    metadata?: Record<string, unknown>
  ): Promise<KycDocument>;
  verifyDocument(accountId: string, documentId: string, verifiedBy: string): Promise<void>;
  rejectDocument(accountId: string, documentId: string, reason: string): Promise<void>;
  getDocuments(accountId: string): Promise<KycDocument[]>;

  // Screening
  runSanctionsScreening(accountId: string): Promise<SanctionsCheckResult>;
  runPepScreening(accountId: string): Promise<PepCheckResult>;
  runAdverseMediaScreening(accountId: string): Promise<AdverseMediaResult>;
  clearSanctionsMatch(accountId: string, matchId: number, clearedBy: string, notes: string): Promise<void>;

  // Risk Assessment
  calculateRiskScore(accountId: string): Promise<number>;
  getRiskClassification(score: number): RiskClassification;
  updateRiskRating(accountId: string, rating: RiskClassification, reason: string): Promise<void>;

  // Transaction Monitoring
  createMonitor(accountId: string, config?: Partial<MonitoringConfig>): Promise<TransactionMonitor>;
  getMonitor(accountId: string): Promise<TransactionMonitor | null>;
  addMonitoringRule(accountId: string, rule: Omit<MonitoringRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<MonitoringRule>;
  removeMonitoringRule(accountId: string, ruleId: string): Promise<void>;
  checkTransaction(accountId: string, transaction: TransactionData): Promise<TransactionCheckResult>;

  // Alerts
  getAlerts(accountId: string, filters?: AlertFilters): Promise<TransactionAlert[]>;
  reviewAlert(alertId: string, reviewedBy: string, status: AlertStatus, notes?: string): Promise<void>;
  escalateAlert(alertId: string, escalatedBy: string, reason: string): Promise<void>;
  fileSar(alertId: string, filedBy: string, sarDetails: SarDetails): Promise<SarResult>;

  // Statistics
  getStatistics(accountId: string): Promise<MonitoringStatistics>;

  // Events
  onEvent(callback: InstitutionalEventCallback): void;
}

export interface KycProfileUpdates {
  level: KycLevel;
  riskScore: number;
  metadata: Record<string, unknown>;
}

export interface TransactionData {
  id: string;
  type: string;
  amount: number;
  currency: string;
  source: string;
  destination: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface TransactionCheckResult {
  passed: boolean;
  alerts: TransactionAlert[];
  riskScore: number;
  matchedRules: string[];
  recommendations: string[];
}

export interface AlertFilters {
  status?: AlertStatus;
  severity?: AlertSeverity;
  type?: AlertType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface SarDetails {
  narrative: string;
  suspiciousActivityType: string;
  reportingJurisdiction: string;
  totalAmount: number;
  dateRange: { start: Date; end: Date };
}

export interface SarResult {
  success: boolean;
  sarId?: string;
  filingDate?: Date;
  error?: string;
}

// ============================================================================
// Default Monitoring Rules
// ============================================================================

const DEFAULT_MONITORING_RULES: Omit<MonitoringRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Large Transaction',
    description: 'Flag transactions above threshold',
    type: 'amount_threshold',
    conditions: [{ field: 'amount', operator: 'greater_than', value: 100000 }],
    action: 'flag',
    priority: 100,
    enabled: true,
    createdBy: 'system',
  },
  {
    name: 'High Velocity',
    description: 'Flag rapid succession of transactions',
    type: 'velocity',
    conditions: [
      { field: 'transaction_count_1h', operator: 'greater_than', value: 10 },
    ],
    action: 'alert',
    priority: 90,
    enabled: true,
    createdBy: 'system',
  },
  {
    name: 'New Destination Large Amount',
    description: 'Flag large transfers to new destinations',
    type: 'pattern_detection',
    conditions: [
      { field: 'is_new_destination', operator: 'equals', value: true },
      { field: 'amount', operator: 'greater_than', value: 50000, logic: 'and' },
    ],
    action: 'require_approval',
    priority: 85,
    enabled: true,
    createdBy: 'system',
  },
  {
    name: 'Structuring Detection',
    description: 'Detect potential structuring behavior',
    type: 'pattern_detection',
    conditions: [
      { field: 'similar_amounts_24h', operator: 'greater_than', value: 3 },
      { field: 'amount', operator: 'less_than', value: 10000, logic: 'and' },
    ],
    action: 'escalate',
    priority: 95,
    enabled: true,
    createdBy: 'system',
  },
  {
    name: 'High Risk Jurisdiction',
    description: 'Flag transactions involving high-risk jurisdictions',
    type: 'jurisdiction_risk',
    conditions: [
      { field: 'jurisdiction_risk', operator: 'equals', value: 'high' },
    ],
    action: 'require_approval',
    priority: 80,
    enabled: true,
    createdBy: 'system',
  },
];

// ============================================================================
// Risk Scoring Configuration
// ============================================================================

interface RiskFactor {
  name: string;
  weight: number;
  evaluate: (profile: KycProfile, context: RiskContext) => number;
}

interface RiskContext {
  transactionVolume30d: number;
  transactionCount30d: number;
  uniqueDestinations30d: number;
  alertCount30d: number;
  accountAge: number;
}

const RISK_FACTORS: RiskFactor[] = [
  {
    name: 'kyc_status',
    weight: 0.15,
    evaluate: (profile) => {
      switch (profile.status) {
        case 'approved': return 0;
        case 'pending_review': return 0.3;
        case 'in_progress': return 0.5;
        case 'not_started': return 0.8;
        case 'rejected': return 1;
        case 'expired': return 0.7;
        default: return 0.5;
      }
    },
  },
  {
    name: 'sanctions_status',
    weight: 0.25,
    evaluate: (profile) => {
      if (profile.sanctions.matched) return 1;
      if (!profile.sanctions.screened) return 0.3;
      return 0;
    },
  },
  {
    name: 'pep_status',
    weight: 0.15,
    evaluate: (profile) => {
      if (!profile.pep.screened) return 0.2;
      if (profile.pep.isPep) return 0.6 + ((profile.pep.pepLevel ?? 0) * 0.1);
      return 0;
    },
  },
  {
    name: 'adverse_media',
    weight: 0.1,
    evaluate: (profile) => {
      if (!profile.adverseMedia.screened) return 0.1;
      const articleCount = profile.adverseMedia.articlesFound;
      if (articleCount === 0) return 0;
      if (articleCount < 3) return 0.3;
      if (articleCount < 10) return 0.6;
      return 0.9;
    },
  },
  {
    name: 'document_verification',
    weight: 0.1,
    evaluate: (profile) => {
      const docs = profile.documents;
      if (docs.length === 0) return 0.8;
      const verified = docs.filter((d) => d.status === 'verified').length;
      const expired = docs.filter((d) => d.status === 'expired').length;
      const rejected = docs.filter((d) => d.status === 'rejected').length;

      if (rejected > 0) return 0.9;
      if (expired > 0) return 0.5;
      return 1 - (verified / Math.max(docs.length, 1));
    },
  },
  {
    name: 'transaction_volume',
    weight: 0.1,
    evaluate: (_profile, context) => {
      const volume = context.transactionVolume30d;
      if (volume < 10000) return 0;
      if (volume < 100000) return 0.2;
      if (volume < 1000000) return 0.4;
      if (volume < 10000000) return 0.6;
      return 0.8;
    },
  },
  {
    name: 'alert_history',
    weight: 0.15,
    evaluate: (_profile, context) => {
      const alerts = context.alertCount30d;
      if (alerts === 0) return 0;
      if (alerts < 3) return 0.3;
      if (alerts < 10) return 0.6;
      return 0.9;
    },
  },
];

// ============================================================================
// KYC/AML Manager Implementation
// ============================================================================

export class DefaultKycAmlManager implements KycAmlManager {
  private readonly profiles = new Map<string, KycProfile>();
  private readonly monitors = new Map<string, TransactionMonitor>();
  private readonly alerts = new Map<string, TransactionAlert>();
  private readonly eventCallbacks: InstitutionalEventCallback[] = [];
  private profileCounter = 0;
  private documentCounter = 0;
  private ruleCounter = 0;
  private alertCounter = 0;

  async createProfile(accountId: string, level: KycLevel = 'basic'): Promise<KycProfile> {
    if (this.profiles.has(accountId)) {
      throw new Error(`KYC profile already exists for account: ${accountId}`);
    }

    const profileId = this.generateProfileId();
    const profile: KycProfile = {
      id: profileId,
      accountId,
      status: 'not_started',
      level,
      provider: 'internal',
      documents: [],
      riskScore: 50, // Default medium risk
      riskLevel: 'medium',
      sanctions: {
        screened: false,
        provider: 'internal',
        matched: false,
        matches: [],
      },
      pep: {
        screened: false,
        isPep: false,
      },
      adverseMedia: {
        screened: false,
        articlesFound: 0,
        riskIndicators: [],
      },
      metadata: {},
    };

    this.profiles.set(accountId, profile);
    return profile;
  }

  async getProfile(accountId: string): Promise<KycProfile | null> {
    return this.profiles.get(accountId) ?? null;
  }

  async updateProfile(
    accountId: string,
    updates: Partial<KycProfileUpdates>
  ): Promise<KycProfile> {
    const profile = this.profiles.get(accountId);
    if (!profile) {
      throw new Error(`KYC profile not found for account: ${accountId}`);
    }

    if (updates.level !== undefined) {
      profile.level = updates.level;
    }
    if (updates.riskScore !== undefined) {
      profile.riskScore = updates.riskScore;
      profile.riskLevel = this.getRiskClassification(updates.riskScore);
    }
    if (updates.metadata !== undefined) {
      profile.metadata = { ...profile.metadata, ...updates.metadata };
    }

    return profile;
  }

  async submitForReview(accountId: string): Promise<void> {
    const profile = this.profiles.get(accountId);
    if (!profile) {
      throw new Error(`KYC profile not found for account: ${accountId}`);
    }

    if (profile.status === 'approved') {
      throw new Error('Profile is already approved');
    }

    // Validate required documents based on level
    const requiredDocs = this.getRequiredDocuments(profile.level);
    const uploadedDocs = profile.documents.map((d) => d.type);
    const missingDocs = requiredDocs.filter((d) => !uploadedDocs.includes(d));

    if (missingDocs.length > 0) {
      throw new Error(`Missing required documents: ${missingDocs.join(', ')}`);
    }

    profile.status = 'pending_review';

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'kyc_status_changed',
      accountId,
      actorId: 'system',
      actorRole: 'admin',
      action: 'submit_for_review',
      resource: 'kyc_profile',
      resourceId: profile.id,
      details: { previousStatus: 'in_progress', newStatus: 'pending_review' },
      metadata: {},
    });
  }

  async approveKyc(accountId: string, approvedBy: string, notes?: string): Promise<void> {
    const profile = this.profiles.get(accountId);
    if (!profile) {
      throw new Error(`KYC profile not found for account: ${accountId}`);
    }

    if (profile.status !== 'pending_review') {
      throw new Error('Profile must be pending review to approve');
    }

    profile.status = 'approved';
    profile.verificationDate = new Date();
    profile.expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    profile.lastReviewDate = new Date();
    profile.nextReviewDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // 6 months

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'kyc_status_changed',
      accountId,
      actorId: approvedBy,
      actorRole: 'compliance_officer',
      action: 'approve_kyc',
      resource: 'kyc_profile',
      resourceId: profile.id,
      details: { notes },
      metadata: {},
    });
  }

  async rejectKyc(accountId: string, rejectedBy: string, reason: string): Promise<void> {
    const profile = this.profiles.get(accountId);
    if (!profile) {
      throw new Error(`KYC profile not found for account: ${accountId}`);
    }

    profile.status = 'rejected';
    profile.lastReviewDate = new Date();

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'kyc_status_changed',
      accountId,
      actorId: rejectedBy,
      actorRole: 'compliance_officer',
      action: 'reject_kyc',
      resource: 'kyc_profile',
      resourceId: profile.id,
      details: { reason },
      metadata: {},
    });
  }

  async uploadDocument(
    accountId: string,
    type: DocumentType,
    hash: string,
    metadata?: Record<string, unknown>
  ): Promise<KycDocument> {
    const profile = this.profiles.get(accountId);
    if (!profile) {
      throw new Error(`KYC profile not found for account: ${accountId}`);
    }

    const docId = this.generateDocumentId();
    const document: KycDocument = {
      id: docId,
      type,
      status: 'pending',
      uploadedAt: new Date(),
      hash,
      metadata: metadata ?? {},
    };

    profile.documents.push(document);

    if (profile.status === 'not_started') {
      profile.status = 'in_progress';
    }

    return document;
  }

  async verifyDocument(accountId: string, documentId: string, _verifiedBy: string): Promise<void> {
    const profile = this.profiles.get(accountId);
    if (!profile) {
      throw new Error(`KYC profile not found for account: ${accountId}`);
    }

    const document = profile.documents.find((d) => d.id === documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    document.status = 'verified';
    document.verifiedAt = new Date();

    // Set expiration for certain document types
    if (['government_id', 'passport'].includes(document.type)) {
      document.expiresAt = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000); // 5 years
    }
  }

  async rejectDocument(accountId: string, documentId: string, reason: string): Promise<void> {
    const profile = this.profiles.get(accountId);
    if (!profile) {
      throw new Error(`KYC profile not found for account: ${accountId}`);
    }

    const document = profile.documents.find((d) => d.id === documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    document.status = 'rejected';
    document.metadata = { ...document.metadata, rejectionReason: reason };
  }

  async getDocuments(accountId: string): Promise<KycDocument[]> {
    const profile = this.profiles.get(accountId);
    if (!profile) {
      return [];
    }
    return profile.documents;
  }

  async runSanctionsScreening(accountId: string): Promise<SanctionsCheckResult> {
    const profile = this.profiles.get(accountId);
    if (!profile) {
      throw new Error(`KYC profile not found for account: ${accountId}`);
    }

    // Simulate sanctions screening
    const result: SanctionsCheckResult = {
      screened: true,
      screenedAt: new Date(),
      provider: 'internal',
      matched: false,
      matches: [],
      nextScreeningDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Daily
    };

    profile.sanctions = result;

    // Recalculate risk score
    profile.riskScore = await this.calculateRiskScore(accountId);
    profile.riskLevel = this.getRiskClassification(profile.riskScore);

    return result;
  }

  async runPepScreening(accountId: string): Promise<PepCheckResult> {
    const profile = this.profiles.get(accountId);
    if (!profile) {
      throw new Error(`KYC profile not found for account: ${accountId}`);
    }

    // Simulate PEP screening
    const result: PepCheckResult = {
      screened: true,
      screenedAt: new Date(),
      isPep: false,
    };

    profile.pep = result;

    // Recalculate risk score
    profile.riskScore = await this.calculateRiskScore(accountId);
    profile.riskLevel = this.getRiskClassification(profile.riskScore);

    return result;
  }

  async runAdverseMediaScreening(accountId: string): Promise<AdverseMediaResult> {
    const profile = this.profiles.get(accountId);
    if (!profile) {
      throw new Error(`KYC profile not found for account: ${accountId}`);
    }

    // Simulate adverse media screening
    const result: AdverseMediaResult = {
      screened: true,
      screenedAt: new Date(),
      articlesFound: 0,
      riskIndicators: [],
    };

    profile.adverseMedia = result;

    // Recalculate risk score
    profile.riskScore = await this.calculateRiskScore(accountId);
    profile.riskLevel = this.getRiskClassification(profile.riskScore);

    return result;
  }

  async clearSanctionsMatch(
    accountId: string,
    matchId: number,
    _clearedBy: string,
    _notes: string
  ): Promise<void> {
    const profile = this.profiles.get(accountId);
    if (!profile) {
      throw new Error(`KYC profile not found for account: ${accountId}`);
    }

    if (matchId >= 0 && matchId < profile.sanctions.matches.length) {
      profile.sanctions.matches[matchId].status = 'cleared';
    }

    // Check if all matches are cleared
    const allCleared = profile.sanctions.matches.every((m) => m.status === 'cleared');
    if (allCleared) {
      profile.sanctions.matched = false;
    }

    // Recalculate risk score
    profile.riskScore = await this.calculateRiskScore(accountId);
    profile.riskLevel = this.getRiskClassification(profile.riskScore);
  }

  async calculateRiskScore(accountId: string): Promise<number> {
    const profile = this.profiles.get(accountId);
    if (!profile) {
      return 50; // Default medium risk
    }

    const context: RiskContext = {
      transactionVolume30d: 0,
      transactionCount30d: 0,
      uniqueDestinations30d: 0,
      alertCount30d: 0,
      accountAge: Date.now() - (profile.verificationDate?.getTime() ?? Date.now()),
    };

    // Get monitoring stats if available
    const monitor = this.monitors.get(accountId);
    if (monitor) {
      context.transactionVolume30d = monitor.statistics.totalTransactions;
      context.alertCount30d = monitor.statistics.alertsGenerated;
    }

    let totalScore = 0;
    let totalWeight = 0;

    for (const factor of RISK_FACTORS) {
      const score = factor.evaluate(profile, context);
      totalScore += score * factor.weight;
      totalWeight += factor.weight;
    }

    return Math.round((totalScore / totalWeight) * 100);
  }

  getRiskClassification(score: number): RiskClassification {
    if (score < 25) return 'low';
    if (score < 50) return 'medium';
    if (score < 75) return 'high';
    return 'prohibited';
  }

  async updateRiskRating(
    accountId: string,
    rating: RiskClassification,
    reason: string
  ): Promise<void> {
    const profile = this.profiles.get(accountId);
    if (!profile) {
      throw new Error(`KYC profile not found for account: ${accountId}`);
    }

    profile.riskLevel = rating;

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'kyc_status_changed',
      accountId,
      actorId: 'system',
      actorRole: 'compliance_officer',
      action: 'update_risk_rating',
      resource: 'kyc_profile',
      resourceId: profile.id,
      details: { newRating: rating, reason },
      metadata: {},
    });
  }

  async createMonitor(
    accountId: string,
    config?: Partial<MonitoringConfig>
  ): Promise<TransactionMonitor> {
    if (this.monitors.has(accountId)) {
      throw new Error(`Monitor already exists for account: ${accountId}`);
    }

    const defaultConfig: MonitoringConfig = {
      realTimeMonitoring: true,
      batchProcessingInterval: 3600,
      alertNotifications: {
        email: true,
        webhook: false,
        recipients: [],
      },
      escalationPolicy: {
        enabled: true,
        levels: [
          {
            level: 1,
            triggerAfterMinutes: 60,
            notifyRoles: ['compliance_officer'],
            autoEscalate: true,
          },
          {
            level: 2,
            triggerAfterMinutes: 240,
            notifyRoles: ['risk_manager', 'admin'],
            autoEscalate: true,
          },
        ],
      },
      retentionDays: 365,
    };

    const monitor: TransactionMonitor = {
      id: `monitor_${accountId}`,
      accountId,
      enabled: true,
      rules: [],
      alerts: [],
      statistics: {
        totalTransactions: 0,
        flaggedTransactions: 0,
        alertsGenerated: 0,
        alertsResolved: 0,
        sarsFiled: 0,
        avgResolutionTime: 0,
        riskDistribution: {},
        lastUpdated: new Date(),
      },
      config: { ...defaultConfig, ...config },
    };

    // Add default rules
    for (const rule of DEFAULT_MONITORING_RULES) {
      const ruleId = this.generateRuleId();
      monitor.rules.push({
        ...rule,
        id: ruleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    this.monitors.set(accountId, monitor);
    return monitor;
  }

  async getMonitor(accountId: string): Promise<TransactionMonitor | null> {
    return this.monitors.get(accountId) ?? null;
  }

  async addMonitoringRule(
    accountId: string,
    rule: Omit<MonitoringRule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MonitoringRule> {
    const monitor = this.monitors.get(accountId);
    if (!monitor) {
      throw new Error(`Monitor not found for account: ${accountId}`);
    }

    const ruleId = this.generateRuleId();
    const newRule: MonitoringRule = {
      ...rule,
      id: ruleId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    monitor.rules.push(newRule);
    return newRule;
  }

  async removeMonitoringRule(accountId: string, ruleId: string): Promise<void> {
    const monitor = this.monitors.get(accountId);
    if (!monitor) {
      throw new Error(`Monitor not found for account: ${accountId}`);
    }

    monitor.rules = monitor.rules.filter((r) => r.id !== ruleId);
  }

  async checkTransaction(
    accountId: string,
    transaction: TransactionData
  ): Promise<TransactionCheckResult> {
    const monitor = this.monitors.get(accountId);
    if (!monitor || !monitor.enabled) {
      return {
        passed: true,
        alerts: [],
        riskScore: 0,
        matchedRules: [],
        recommendations: [],
      };
    }

    const matchedRules: string[] = [];
    const alerts: TransactionAlert[] = [];
    let riskScore = 0;

    // Evaluate each rule
    for (const rule of monitor.rules) {
      if (!rule.enabled) continue;

      const matches = this.evaluateRule(rule, transaction);
      if (matches) {
        matchedRules.push(rule.id);
        riskScore += rule.priority / 10;

        // Generate alert based on action
        if (rule.action !== 'log_only') {
          const alert = this.createAlert(accountId, transaction.id, rule);
          alerts.push(alert);
          monitor.alerts.push(alert);
          this.alerts.set(alert.id, alert);
        }
      }
    }

    // Update statistics
    monitor.statistics.totalTransactions++;
    if (matchedRules.length > 0) {
      monitor.statistics.flaggedTransactions++;
      monitor.statistics.alertsGenerated += alerts.length;
    }
    monitor.statistics.lastUpdated = new Date();

    const passed = !alerts.some((a) => a.severity === 'critical' || a.status === 'open');

    return {
      passed,
      alerts,
      riskScore: Math.min(riskScore, 100),
      matchedRules,
      recommendations: this.generateRecommendations(alerts, riskScore),
    };
  }

  async getAlerts(accountId: string, filters?: AlertFilters): Promise<TransactionAlert[]> {
    const monitor = this.monitors.get(accountId);
    if (!monitor) {
      return [];
    }

    let alerts = [...monitor.alerts];

    if (filters?.status) {
      alerts = alerts.filter((a) => a.status === filters.status);
    }
    if (filters?.severity) {
      alerts = alerts.filter((a) => a.severity === filters.severity);
    }
    if (filters?.type) {
      alerts = alerts.filter((a) => a.type === filters.type);
    }
    if (filters?.startDate) {
      alerts = alerts.filter((a) => a.createdAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      alerts = alerts.filter((a) => a.createdAt <= filters.endDate!);
    }
    if (filters?.limit) {
      alerts = alerts.slice(0, filters.limit);
    }

    return alerts;
  }

  async reviewAlert(
    alertId: string,
    reviewedBy: string,
    status: AlertStatus,
    notes?: string
  ): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = status;
    alert.reviewedAt = new Date();
    alert.reviewedBy = reviewedBy;
    if (notes) {
      alert.resolutionNotes = notes;
    }

    // Update statistics
    const monitor = this.monitors.get(alert.accountId);
    if (monitor && status === 'resolved') {
      monitor.statistics.alertsResolved++;
    }

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'alert_resolved',
      accountId: alert.accountId,
      actorId: reviewedBy,
      actorRole: 'compliance_officer',
      action: 'review_alert',
      resource: 'alert',
      resourceId: alertId,
      details: { status, notes },
      metadata: {},
    });
  }

  async escalateAlert(alertId: string, escalatedBy: string, reason: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = 'escalated';
    alert.details = { ...alert.details, escalationReason: reason, escalatedBy };
  }

  async fileSar(
    alertId: string,
    filedBy: string,
    _sarDetails: SarDetails
  ): Promise<SarResult> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return { success: false, error: 'Alert not found' };
    }

    alert.status = 'sar_filed';
    alert.resolution = 'SAR filed';
    alert.reviewedAt = new Date();
    alert.reviewedBy = filedBy;

    const monitor = this.monitors.get(alert.accountId);
    if (monitor) {
      monitor.statistics.sarsFiled++;
    }

    const sarId = `SAR_${Date.now()}_${alertId}`;

    return {
      success: true,
      sarId,
      filingDate: new Date(),
    };
  }

  async getStatistics(accountId: string): Promise<MonitoringStatistics> {
    const monitor = this.monitors.get(accountId);
    if (!monitor) {
      return {
        totalTransactions: 0,
        flaggedTransactions: 0,
        alertsGenerated: 0,
        alertsResolved: 0,
        sarsFiled: 0,
        avgResolutionTime: 0,
        riskDistribution: {},
        lastUpdated: new Date(),
      };
    }
    return monitor.statistics;
  }

  onEvent(callback: InstitutionalEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private generateProfileId(): string {
    this.profileCounter++;
    return `kyc_${Date.now()}_${this.profileCounter.toString(36)}`;
  }

  private generateDocumentId(): string {
    this.documentCounter++;
    return `doc_${Date.now()}_${this.documentCounter.toString(36)}`;
  }

  private generateRuleId(): string {
    this.ruleCounter++;
    return `rule_${Date.now()}_${this.ruleCounter.toString(36)}`;
  }

  private generateAlertId(): string {
    this.alertCounter++;
    return `alert_${Date.now()}_${this.alertCounter.toString(36)}`;
  }

  private getRequiredDocuments(level: KycLevel): DocumentType[] {
    switch (level) {
      case 'basic':
        return ['government_id'];
      case 'standard':
        return ['government_id', 'proof_of_address'];
      case 'enhanced':
        return ['government_id', 'proof_of_address', 'source_of_funds'];
      case 'institutional':
        return [
          'articles_of_incorporation',
          'certificate_of_good_standing',
          'beneficial_ownership',
          'financial_statements',
          'board_resolution',
        ];
      default:
        return ['government_id'];
    }
  }

  private evaluateRule(rule: MonitoringRule, transaction: TransactionData): boolean {
    for (const condition of rule.conditions) {
      const value = this.getFieldValue(transaction, condition.field);
      const matches = this.evaluateCondition(value, condition.operator, condition.value);

      if (!matches) {
        return false;
      }
    }
    return true;
  }

  private getFieldValue(transaction: TransactionData, field: string): unknown {
    switch (field) {
      case 'amount':
        return transaction.amount;
      case 'type':
        return transaction.type;
      case 'currency':
        return transaction.currency;
      case 'source':
        return transaction.source;
      case 'destination':
        return transaction.destination;
      default:
        return transaction.metadata[field];
    }
  }

  private evaluateCondition(
    value: unknown,
    operator: string,
    conditionValue: unknown
  ): boolean {
    switch (operator) {
      case 'equals':
        return value === conditionValue;
      case 'not_equals':
        return value !== conditionValue;
      case 'greater_than':
        return (value as number) > (conditionValue as number);
      case 'less_than':
        return (value as number) < (conditionValue as number);
      case 'greater_than_or_equals':
        return (value as number) >= (conditionValue as number);
      case 'less_than_or_equals':
        return (value as number) <= (conditionValue as number);
      case 'contains':
        return String(value).includes(String(conditionValue));
      case 'in':
        return (conditionValue as unknown[]).includes(value);
      default:
        return false;
    }
  }

  private createAlert(
    accountId: string,
    transactionId: string,
    rule: MonitoringRule
  ): TransactionAlert {
    const alertId = this.generateAlertId();

    const typeMap: Record<RuleType, AlertType> = {
      amount_threshold: 'threshold_breach',
      velocity: 'velocity_anomaly',
      destination_screening: 'high_risk_jurisdiction',
      pattern_detection: 'pattern_match',
      behavioral_anomaly: 'behavioral_deviation',
      jurisdiction_risk: 'high_risk_jurisdiction',
      time_based: 'suspicious_activity',
      custom: 'suspicious_activity',
    };

    const severityMap: Record<RuleAction, AlertSeverity> = {
      flag: 'low',
      alert: 'medium',
      block: 'critical',
      require_approval: 'high',
      escalate: 'high',
      log_only: 'low',
    };

    return {
      id: alertId,
      accountId,
      transactionId,
      ruleId: rule.id,
      type: typeMap[rule.type] ?? 'suspicious_activity',
      severity: severityMap[rule.action] ?? 'medium',
      status: 'open',
      description: rule.description,
      details: {
        ruleName: rule.name,
        ruleType: rule.type,
        action: rule.action,
      },
      createdAt: new Date(),
    };
  }

  private generateRecommendations(alerts: TransactionAlert[], riskScore: number): string[] {
    const recommendations: string[] = [];

    if (riskScore > 75) {
      recommendations.push('High risk transaction - requires immediate review');
    }

    if (alerts.some((a) => a.type === 'velocity_anomaly')) {
      recommendations.push('Review recent transaction velocity patterns');
    }

    if (alerts.some((a) => a.type === 'threshold_breach')) {
      recommendations.push('Verify source of funds for large transaction');
    }

    if (alerts.some((a) => a.type === 'pattern_match')) {
      recommendations.push('Check for potential structuring behavior');
    }

    return recommendations;
  }

  private emitEvent(event: Parameters<InstitutionalEventCallback>[0]): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createKycAmlManager(): DefaultKycAmlManager {
  return new DefaultKycAmlManager();
}
