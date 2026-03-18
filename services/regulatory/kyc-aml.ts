/**
 * TONAIAgent Regulatory Strategy - KYC/AML Framework
 * Tiered KYC/AML compliance with identity verification, sanctions screening,
 * and transaction monitoring capabilities.
 */

import {
  KycTier,
  KycTierConfig,
  KycApplication,
  KycResult,
  KycDocument,
  DocumentType,
  TransactionCheck,
  TransactionCheckResult,
  TransactionMonitoringConfig,
  MonitoringRule,
  AmlAlert,
  AlertStatus,
  AlertPriority,
  AddressScreeningResult,
  UserScreeningResult,
  ScreeningResults,
  ScreeningResult,
  RegulatoryEvent,
  RegulatoryEventCallback,
  RiskLevel,
} from './types';

// ============================================================================
// Default Tier Configurations
// ============================================================================

const DEFAULT_TIER_CONFIGS: Record<KycTier, KycTierConfig> = {
  basic: {
    name: 'basic',
    requirements: {
      emailVerification: true,
      phoneVerification: false,
      identityDocument: false,
      addressVerification: false,
      sourceOfFunds: false,
      sanctionsCheck: true,
    },
    limits: {
      dailyTransaction: 1000,
      monthlyTransaction: 5000,
      singleTransaction: 500,
      currency: 'USD',
    },
    applicableTo: ['non-custodial', 'demo', 'limited_trading'],
    riskThreshold: 30,
  },
  standard: {
    name: 'standard',
    requirements: {
      emailVerification: true,
      phoneVerification: true,
      identityDocument: true,
      addressVerification: true,
      sourceOfFunds: false,
      sanctionsCheck: true,
      pepCheck: true,
    },
    limits: {
      dailyTransaction: 50000,
      monthlyTransaction: 200000,
      singleTransaction: 25000,
      currency: 'USD',
    },
    applicableTo: ['retail_trading', 'custody', 'staking'],
    riskThreshold: 50,
  },
  enhanced: {
    name: 'enhanced',
    requirements: {
      emailVerification: true,
      phoneVerification: true,
      identityDocument: true,
      addressVerification: true,
      sourceOfFunds: true,
      sourceOfWealth: true,
      sanctionsCheck: true,
      pepCheck: true,
      adverseMediaCheck: true,
      ongoingMonitoring: true,
    },
    limits: {
      dailyTransaction: 1000000,
      monthlyTransaction: 10000000,
      singleTransaction: 500000,
      currency: 'USD',
    },
    applicableTo: ['professional_trading', 'lending', 'margin', 'institutional'],
    riskThreshold: 70,
  },
  institutional: {
    name: 'institutional',
    requirements: {
      emailVerification: true,
      phoneVerification: true,
      identityDocument: true,
      addressVerification: true,
      sourceOfFunds: true,
      sourceOfWealth: true,
      sanctionsCheck: true,
      pepCheck: true,
      adverseMediaCheck: true,
      ongoingMonitoring: true,
      entityVerification: true,
      beneficialOwnership: true,
      directorVerification: true,
      companyDocuments: true,
      financialStatements: true,
      amlPolicy: true,
      regulatoryStatus: true,
      enhancedDueDiligence: true,
    },
    limits: {
      dailyTransaction: 'unlimited',
      monthlyTransaction: 'unlimited',
      singleTransaction: 'unlimited',
    },
    applicableTo: ['hedge_fund', 'family_office', 'corporate', 'bank'],
    riskThreshold: 100,
  },
};

// ============================================================================
// Default Monitoring Rules
// ============================================================================

const DEFAULT_MONITORING_RULES: MonitoringRule[] = [
  {
    id: 'large_transaction',
    name: 'Large Transaction',
    condition: { amount: { gte: 10000 } },
    action: 'flag_review',
    priority: 'high',
    enabled: true,
  },
  {
    id: 'structuring_detection',
    name: 'Structuring Detection',
    condition: { pattern: 'multiple_below_threshold' },
    action: 'alert',
    priority: 'critical',
    enabled: true,
  },
  {
    id: 'high_risk_destination',
    name: 'High-Risk Destination',
    condition: { destination: { in: 'high_risk_addresses' } },
    action: 'block',
    priority: 'critical',
    enabled: true,
  },
  {
    id: 'rapid_succession',
    name: 'Rapid Succession',
    condition: { frequency: { within: '1h', count: { gte: 10 } } },
    action: 'flag_review',
    priority: 'medium',
    enabled: true,
  },
  {
    id: 'new_address_large_transfer',
    name: 'New Address Large Transfer',
    condition: {
      and: [
        { amount: { gte: 5000 } },
        { destination: { firstSeen: 'today' } },
      ],
    },
    action: 'manual_approval',
    priority: 'high',
    enabled: true,
  },
];

// ============================================================================
// KYC/AML Manager Implementation
// ============================================================================

export interface KycAmlManagerConfig {
  enabled?: boolean;
  tieredCompliance?: boolean;
  defaultTier?: KycTier;
  providers?: {
    kyc?: string[];
    sanctions?: string[];
    monitoring?: string[];
  };
  sanctionsLists?: string[];
  pepScreening?: boolean;
  adverseMediaMonitoring?: boolean;
  customTierConfigs?: Partial<Record<KycTier, Partial<KycTierConfig>>>;
}

export class KycAmlManager {
  private config: Required<KycAmlManagerConfig>;
  private tierConfigs: Record<KycTier, KycTierConfig>;
  private monitoringRules: MonitoringRule[];
  private alerts: Map<string, AmlAlert> = new Map();
  private kycApplications: Map<string, KycResult> = new Map();
  private eventListeners: RegulatoryEventCallback[] = [];
  private highRiskAddresses: Set<string> = new Set();
  private blacklistedAddresses: Set<string> = new Set();

  constructor(config: KycAmlManagerConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      tieredCompliance: config.tieredCompliance ?? true,
      defaultTier: config.defaultTier ?? 'basic',
      providers: config.providers ?? {
        kyc: ['onfido', 'jumio'],
        sanctions: ['chainalysis', 'elliptic'],
        monitoring: ['chainalysis'],
      },
      sanctionsLists: config.sanctionsLists ?? ['ofac', 'eu', 'un', 'uk'],
      pepScreening: config.pepScreening ?? true,
      adverseMediaMonitoring: config.adverseMediaMonitoring ?? true,
      customTierConfigs: config.customTierConfigs ?? {},
    };

    // Merge custom tier configs with defaults
    this.tierConfigs = { ...DEFAULT_TIER_CONFIGS };
    for (const [tier, customConfig] of Object.entries(this.config.customTierConfigs)) {
      if (customConfig) {
        this.tierConfigs[tier as KycTier] = {
          ...this.tierConfigs[tier as KycTier],
          ...customConfig,
        };
      }
    }

    this.monitoringRules = [...DEFAULT_MONITORING_RULES];
  }

  // ============================================================================
  // KYC Processing
  // ============================================================================

  async processKyc(application: KycApplication): Promise<KycResult> {
    if (!this.config.enabled) {
      return this.createAutoApprovalResult(application);
    }

    const tierConfig = this.tierConfigs[application.requestedTier];

    // Verify required documents
    const documentVerification = this.verifyDocuments(application.documents, tierConfig);

    // Run screenings
    const screeningResults = await this.runScreenings(application);

    // Calculate risk score
    const riskScore = this.calculateRiskScore(documentVerification, screeningResults);
    const riskLevel = this.getRiskLevel(riskScore);

    // Determine approval status
    const status = this.determineApprovalStatus(
      documentVerification,
      screeningResults,
      riskScore,
      tierConfig
    );

    const result: KycResult = {
      applicationId: this.generateId('kyc'),
      userId: application.userId,
      status,
      requestedTier: application.requestedTier,
      approvedTier: status === 'approved' ? application.requestedTier : undefined,
      riskScore,
      riskLevel,
      screeningResults,
      pendingDocuments: documentVerification.missingDocuments,
      rejectionReasons: status === 'rejected' ? documentVerification.issues : undefined,
      expiryDate: status === 'approved' ? this.calculateExpiryDate() : undefined,
      reviewedAt: new Date(),
    };

    this.kycApplications.set(result.applicationId, result);

    // Emit event
    this.emitEvent({
      type: status === 'approved' ? 'kyc.application_approved' :
            status === 'rejected' ? 'kyc.application_rejected' : 'kyc.application_submitted',
      timestamp: new Date(),
      payload: { applicationId: result.applicationId, userId: application.userId, status },
      source: 'kyc-aml-manager',
    });

    return result;
  }

  async getKycStatus(userId: string): Promise<KycResult | undefined> {
    for (const result of this.kycApplications.values()) {
      if (result.userId === userId) {
        return result;
      }
    }
    return undefined;
  }

  getTierConfig(tier: KycTier): KycTierConfig {
    return this.tierConfigs[tier];
  }

  getAllTierConfigs(): Record<KycTier, KycTierConfig> {
    return { ...this.tierConfigs };
  }

  // ============================================================================
  // Transaction Monitoring
  // ============================================================================

  async configureMonitoring(config: Partial<TransactionMonitoringConfig>): Promise<void> {
    if (config.rules) {
      this.monitoringRules = config.rules;
    }
  }

  async checkTransaction(transaction: TransactionCheck): Promise<TransactionCheckResult> {
    if (!this.config.enabled) {
      return {
        transactionId: transaction.transactionId,
        approved: true,
        riskScore: 0,
        riskLevel: 'low',
        flags: [],
        matchedRules: [],
        requiredActions: [],
        reviewRequired: false,
      };
    }

    const matchedRules: string[] = [];
    const flags: TransactionCheckResult['flags'] = [];
    let maxPriority: AlertPriority = 'low';
    let action: 'allow' | 'flag_review' | 'manual_approval' | 'block' | 'alert' = 'allow';

    // Check against monitoring rules
    for (const rule of this.monitoringRules) {
      if (!rule.enabled) continue;

      if (this.evaluateRuleCondition(rule.condition, transaction)) {
        matchedRules.push(rule.id);
        flags.push({
          type: rule.name,
          description: `Matched rule: ${rule.name}`,
          severity: rule.priority,
          details: { ruleId: rule.id },
        });

        if (this.getPriorityValue(rule.priority) > this.getPriorityValue(maxPriority)) {
          maxPriority = rule.priority;
          action = rule.action;
        }
      }
    }

    // Check against high-risk and blacklisted addresses
    if (this.blacklistedAddresses.has(transaction.destination)) {
      action = 'block';
      maxPriority = 'critical';
      flags.push({
        type: 'Blacklisted Address',
        description: 'Destination address is blacklisted',
        severity: 'critical',
        details: { address: transaction.destination },
      });
    } else if (this.highRiskAddresses.has(transaction.destination)) {
      if (action !== 'block') action = 'flag_review';
      flags.push({
        type: 'High-Risk Address',
        description: 'Destination address is flagged as high-risk',
        severity: 'high',
        details: { address: transaction.destination },
      });
    }

    const riskScore = this.calculateTransactionRiskScore(transaction, matchedRules, flags);
    const riskLevel = this.getRiskLevel(riskScore);

    const approved = action === 'allow' || action === 'flag_review';
    const reviewRequired = action === 'flag_review' || action === 'manual_approval';

    // Create alert if needed
    const alerts: AmlAlert[] = [];
    if (action === 'alert' || action === 'block' || maxPriority === 'critical') {
      const alert = this.createAlert(transaction, matchedRules, riskScore);
      alerts.push(alert);
    }

    const result: TransactionCheckResult = {
      transactionId: transaction.transactionId,
      approved,
      riskScore,
      riskLevel,
      flags,
      matchedRules,
      requiredActions: this.getRequiredActions(action, flags),
      alerts: alerts.length > 0 ? alerts : undefined,
      reviewRequired,
    };

    // Emit event if flagged
    if (!approved || reviewRequired) {
      this.emitEvent({
        type: approved ? 'aml.transaction_flagged' : 'aml.transaction_blocked',
        timestamp: new Date(),
        payload: { transactionId: transaction.transactionId, riskScore, action },
        source: 'kyc-aml-manager',
      });
    }

    return result;
  }

  // ============================================================================
  // Screening
  // ============================================================================

  async screenAddress(address: string): Promise<AddressScreeningResult> {
    // Simulate address screening
    const isHighRisk = this.highRiskAddresses.has(address);
    const isBlacklisted = this.blacklistedAddresses.has(address);

    const riskCategory: RiskLevel = isBlacklisted ? 'critical' : isHighRisk ? 'high' : 'low';

    return {
      address,
      sanctionsHit: isBlacklisted,
      riskCategory,
      associatedEntities: [],
      riskIndicators: isHighRisk ? ['High-risk jurisdiction', 'Mixing service detected'] : [],
      recommendations: isHighRisk
        ? ['Enhanced monitoring recommended', 'Manual review required']
        : ['No action required'],
      lastUpdated: new Date(),
    };
  }

  async screenUser(_userInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    nationality: string;
    countries?: string[];
  }): Promise<UserScreeningResult> {
    // Simulate user screening (userInfo would be used in production)
    const pepStatus = {
      isPep: false,
      riskLevel: 'low' as RiskLevel,
    };

    const sanctionsMatch = {
      hasMatch: false,
      matches: [],
      sources: this.config.sanctionsLists ?? [],
    };

    const adverseMedia = {
      hasAdverseMedia: false,
      articles: [],
      riskLevel: 'low' as RiskLevel,
    };

    return {
      pepStatus,
      sanctionsMatch,
      adverseMedia,
      overallRisk: 'low',
      recommendations: ['Standard monitoring'],
    };
  }

  // ============================================================================
  // Alert Management
  // ============================================================================

  async createAlertManual(params: {
    type: string;
    priority: AlertPriority;
    userId: string;
    transactionIds: string[];
    description: string;
    riskScore: number;
  }): Promise<AmlAlert> {
    const alert: AmlAlert = {
      id: this.generateId('alert'),
      type: params.type,
      priority: params.priority,
      status: 'open',
      userId: params.userId,
      transactionIds: params.transactionIds,
      description: params.description,
      riskScore: params.riskScore,
      createdAt: new Date(),
    };

    this.alerts.set(alert.id, alert);

    this.emitEvent({
      type: 'aml.alert_created',
      timestamp: new Date(),
      payload: { alertId: alert.id, priority: params.priority },
      source: 'kyc-aml-manager',
    });

    return alert;
  }

  async getAlerts(filters?: {
    status?: AlertStatus;
    priority?: AlertPriority;
    userId?: string;
  }): Promise<AmlAlert[]> {
    let alerts = Array.from(this.alerts.values());

    if (filters?.status) {
      alerts = alerts.filter((a) => a.status === filters.status);
    }
    if (filters?.priority) {
      alerts = alerts.filter((a) => a.priority === filters.priority);
    }
    if (filters?.userId) {
      alerts = alerts.filter((a) => a.userId === filters.userId);
    }

    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateAlertStatus(
    alertId: string,
    status: AlertStatus,
    assignedTo?: string
  ): Promise<AmlAlert> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = status;
    if (assignedTo) {
      alert.assignedTo = assignedTo;
    }
    if (status === 'resolved' || status === 'false_positive') {
      alert.resolvedAt = new Date();
      alert.resolution = status;
    }

    this.emitEvent({
      type: 'aml.alert_resolved',
      timestamp: new Date(),
      payload: { alertId, status },
      source: 'kyc-aml-manager',
    });

    return alert;
  }

  // ============================================================================
  // Risk Address Management
  // ============================================================================

  addHighRiskAddress(address: string): void {
    this.highRiskAddresses.add(address);
  }

  removeHighRiskAddress(address: string): void {
    this.highRiskAddresses.delete(address);
  }

  addBlacklistedAddress(address: string): void {
    this.blacklistedAddresses.add(address);
  }

  removeBlacklistedAddress(address: string): void {
    this.blacklistedAddresses.delete(address);
  }

  // ============================================================================
  // Event System
  // ============================================================================

  onEvent(callback: RegulatoryEventCallback): void {
    this.eventListeners.push(callback);
  }

  private emitEvent(event: RegulatoryEvent): void {
    this.eventListeners.forEach((listener) => listener(event));
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createAutoApprovalResult(application: KycApplication): KycResult {
    return {
      applicationId: this.generateId('kyc'),
      userId: application.userId,
      status: 'approved',
      requestedTier: application.requestedTier,
      approvedTier: application.requestedTier,
      riskScore: 0,
      riskLevel: 'low',
      screeningResults: this.createEmptyScreeningResults(),
      expiryDate: this.calculateExpiryDate(),
      reviewedAt: new Date(),
    };
  }

  private createEmptyScreeningResults(): ScreeningResults {
    const emptyResult: ScreeningResult = {
      screened: false,
      hit: false,
      matches: [],
      riskLevel: 'low',
      lastScreened: new Date(),
    };

    return {
      sanctions: emptyResult,
      pep: emptyResult,
      adverseMedia: emptyResult,
      watchlist: emptyResult,
      overallRisk: 'low',
    };
  }

  private verifyDocuments(
    documents: KycDocument[],
    tierConfig: KycTierConfig
  ): { verified: boolean; missingDocuments: DocumentType[]; issues: string[] } {
    const missingDocuments: DocumentType[] = [];
    const issues: string[] = [];

    if (tierConfig.requirements.identityDocument) {
      const hasIdDoc = documents.some(
        (d) => ['passport', 'national_id', 'drivers_license'].includes(d.type)
      );
      if (!hasIdDoc) {
        missingDocuments.push('passport');
        issues.push('Identity document required');
      }
    }

    if (tierConfig.requirements.addressVerification) {
      const hasAddressDoc = documents.some(
        (d) => ['utility_bill', 'bank_statement'].includes(d.type)
      );
      if (!hasAddressDoc) {
        missingDocuments.push('utility_bill');
        issues.push('Address verification document required');
      }
    }

    if (tierConfig.requirements.entityVerification) {
      const hasEntityDocs = documents.some(
        (d) => d.type === 'articles_of_incorporation'
      );
      if (!hasEntityDocs) {
        missingDocuments.push('articles_of_incorporation');
        issues.push('Entity verification documents required');
      }
    }

    return {
      verified: missingDocuments.length === 0,
      missingDocuments,
      issues,
    };
  }

  private async runScreenings(application: KycApplication): Promise<ScreeningResults> {
    const results = this.createEmptyScreeningResults();

    // Simulate sanctions screening
    results.sanctions = {
      screened: true,
      hit: false,
      matches: [],
      riskLevel: 'low',
      lastScreened: new Date(),
    };

    // Simulate PEP screening if enabled
    if (this.config.pepScreening && application.personalInfo) {
      results.pep = {
        screened: true,
        hit: false,
        matches: [],
        riskLevel: 'low',
        lastScreened: new Date(),
      };
    }

    // Simulate adverse media screening if enabled
    if (this.config.adverseMediaMonitoring) {
      results.adverseMedia = {
        screened: true,
        hit: false,
        matches: [],
        riskLevel: 'low',
        lastScreened: new Date(),
      };
    }

    // Calculate overall risk
    const riskLevels = [
      results.sanctions.riskLevel,
      results.pep.riskLevel,
      results.adverseMedia.riskLevel,
      results.watchlist.riskLevel,
    ];
    results.overallRisk = this.getHighestRiskLevel(riskLevels);

    return results;
  }

  private calculateRiskScore(
    documentVerification: { verified: boolean },
    screeningResults: ScreeningResults
  ): number {
    let score = 0;

    // Document verification contribution
    if (!documentVerification.verified) score += 20;

    // Screening results contribution
    if (screeningResults.sanctions.hit) score += 100;
    if (screeningResults.pep.hit) score += 40;
    if (screeningResults.adverseMedia.hit) score += 30;
    if (screeningResults.watchlist.hit) score += 50;

    // Risk level contributions
    score += this.getRiskLevelScore(screeningResults.sanctions.riskLevel) * 0.4;
    score += this.getRiskLevelScore(screeningResults.pep.riskLevel) * 0.2;
    score += this.getRiskLevelScore(screeningResults.adverseMedia.riskLevel) * 0.2;
    score += this.getRiskLevelScore(screeningResults.watchlist.riskLevel) * 0.2;

    return Math.min(Math.round(score), 100);
  }

  private calculateTransactionRiskScore(
    transaction: TransactionCheck,
    matchedRules: string[],
    flags: TransactionCheckResult['flags']
  ): number {
    let score = 0;

    // Base score from transaction amount
    if (transaction.amount > 100000) score += 30;
    else if (transaction.amount > 50000) score += 20;
    else if (transaction.amount > 10000) score += 10;

    // Add score for each matched rule
    score += matchedRules.length * 15;

    // Add score for flag severity
    for (const flag of flags) {
      switch (flag.severity) {
        case 'critical': score += 40; break;
        case 'high': score += 25; break;
        case 'medium': score += 15; break;
        case 'low': score += 5; break;
      }
    }

    return Math.min(Math.round(score), 100);
  }

  private getRiskLevel(score: number): RiskLevel {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private getRiskLevelScore(level: RiskLevel): number {
    switch (level) {
      case 'critical': return 100;
      case 'high': return 70;
      case 'medium': return 40;
      case 'low': return 10;
    }
  }

  private getHighestRiskLevel(levels: RiskLevel[]): RiskLevel {
    const order: RiskLevel[] = ['critical', 'high', 'medium', 'low'];
    for (const level of order) {
      if (levels.includes(level)) return level;
    }
    return 'low';
  }

  private determineApprovalStatus(
    documentVerification: { verified: boolean },
    screeningResults: ScreeningResults,
    riskScore: number,
    tierConfig: KycTierConfig
  ): KycResult['status'] {
    // Auto-reject on sanctions hit
    if (screeningResults.sanctions.hit) return 'rejected';

    // Reject if missing required documents
    if (!documentVerification.verified) return 'additional_info_required';

    // Check against tier risk threshold
    if (riskScore > tierConfig.riskThreshold) return 'pending';

    // High risk requires review
    if (screeningResults.overallRisk === 'high' || screeningResults.overallRisk === 'critical') {
      return 'pending';
    }

    return 'approved';
  }

  private calculateExpiryDate(): Date {
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 2); // 2 year validity
    return expiry;
  }

  private evaluateRuleCondition(
    condition: MonitoringRule['condition'],
    transaction: TransactionCheck
  ): boolean {
    // Amount conditions
    if (condition.amount) {
      if (condition.amount.gte !== undefined && transaction.amount < condition.amount.gte) {
        return false;
      }
      if (condition.amount.gt !== undefined && transaction.amount <= condition.amount.gt) {
        return false;
      }
      if (condition.amount.lte !== undefined && transaction.amount > condition.amount.lte) {
        return false;
      }
      if (condition.amount.lt !== undefined && transaction.amount >= condition.amount.lt) {
        return false;
      }
    }

    // Destination conditions
    if (condition.destination) {
      if (condition.destination.in === 'high_risk_addresses') {
        if (!this.highRiskAddresses.has(transaction.destination)) {
          return false;
        }
      }
    }

    // AND conditions
    if (condition.and) {
      return condition.and.every((c) => this.evaluateRuleCondition(c, transaction));
    }

    // OR conditions
    if (condition.or) {
      return condition.or.some((c) => this.evaluateRuleCondition(c, transaction));
    }

    return true;
  }

  private getPriorityValue(priority: AlertPriority): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
    }
  }

  private createAlert(
    transaction: TransactionCheck,
    matchedRules: string[],
    riskScore: number
  ): AmlAlert {
    const priority: AlertPriority = riskScore >= 80 ? 'critical' :
      riskScore >= 60 ? 'high' :
      riskScore >= 40 ? 'medium' : 'low';

    const alert: AmlAlert = {
      id: this.generateId('alert'),
      type: 'transaction_monitoring',
      priority,
      status: 'open',
      userId: transaction.userId,
      transactionIds: [transaction.transactionId],
      description: `Transaction flagged by rules: ${matchedRules.join(', ')}`,
      riskScore,
      createdAt: new Date(),
    };

    this.alerts.set(alert.id, alert);

    this.emitEvent({
      type: 'aml.alert_created',
      timestamp: new Date(),
      payload: { alertId: alert.id, transactionId: transaction.transactionId, priority },
      source: 'kyc-aml-manager',
    });

    return alert;
  }

  private getRequiredActions(
    action: 'allow' | 'flag_review' | 'manual_approval' | 'block' | 'alert',
    flags: TransactionCheckResult['flags']
  ): string[] {
    const actions: string[] = [];

    switch (action) {
      case 'block':
        actions.push('Transaction blocked - escalate to compliance');
        break;
      case 'manual_approval':
        actions.push('Manual approval required before processing');
        break;
      case 'flag_review':
        actions.push('Review transaction within 24 hours');
        break;
      case 'alert':
        actions.push('Alert generated - monitor for patterns');
        break;
    }

    if (flags.some((f) => f.severity === 'critical')) {
      actions.push('Immediate compliance review required');
    }

    return actions;
  }
}

export function createKycAmlManager(config?: KycAmlManagerConfig): KycAmlManager {
  return new KycAmlManager(config);
}
