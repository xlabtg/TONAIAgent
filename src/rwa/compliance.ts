/**
 * TONAIAgent - RWA Compliance & Legal Layer
 *
 * KYC/AML integration, jurisdictional restrictions, permissioned access,
 * accredited investor verification, institutional onboarding, and
 * regulatory audit support.
 */

import {
  InvestorProfile,
  InvestorType,
  KycLevel,
  ComplianceStatus,
  ComplianceCheck,
  JurisdictionRule,
  InstitutionalOnboarding,
  RWAAssetClass,
  ComplianceConfig,
  RWAEvent,
  RWAEventCallback,
} from './types';

// ============================================================================
// Compliance Manager Interface
// ============================================================================

export interface ComplianceManager {
  readonly config: ComplianceConfig;

  // Investor management
  createInvestorProfile(
    userId: string,
    investorType: InvestorType,
    details?: Partial<InvestorProfile>
  ): Promise<InvestorProfile>;
  getInvestorProfile(investorId: string): InvestorProfile | undefined;
  updateInvestorProfile(investorId: string, updates: Partial<InvestorProfile>): Promise<InvestorProfile>;
  listInvestors(filters?: InvestorFilters): InvestorProfile[];

  // KYC/AML
  approveKyc(investorId: string, level: KycLevel): Promise<ComplianceCheck>;
  rejectKyc(investorId: string, reason: string): Promise<ComplianceCheck>;
  approveAml(investorId: string): Promise<ComplianceCheck>;
  rejectAml(investorId: string, reason: string): Promise<ComplianceCheck>;
  getComplianceChecks(investorId: string): ComplianceCheck[];

  // Accreditation
  verifyAccreditation(
    investorId: string,
    evidence: AccreditationEvidence
  ): Promise<ComplianceCheck>;
  revokeAccreditation(investorId: string, reason: string): Promise<void>;

  // Access control
  checkInvestorAccess(
    investorId: string,
    assetId: string,
    assetClass: RWAAssetClass,
    jurisdiction: string,
    amount: number
  ): Promise<AccessCheckResult>;

  // Jurisdiction rules
  addJurisdictionRule(rule: JurisdictionRule): void;
  getJurisdictionRule(jurisdiction: string): JurisdictionRule | undefined;
  listJurisdictionRules(): JurisdictionRule[];

  // Institutional onboarding
  submitInstitutionalOnboarding(
    request: Omit<InstitutionalOnboarding, 'id' | 'status' | 'submittedAt'>
  ): Promise<InstitutionalOnboarding>;
  reviewInstitutionalOnboarding(
    onboardingId: string,
    approved: boolean,
    reason?: string
  ): Promise<InstitutionalOnboarding>;
  getInstitutionalOnboarding(onboardingId: string): InstitutionalOnboarding | undefined;
  listInstitutionalOnboardings(filters?: OnboardingFilters): InstitutionalOnboarding[];

  // Regulatory audit
  generateAuditReport(filters?: AuditFilters): RegulatoryAuditReport;

  // Events
  onEvent(callback: RWAEventCallback): void;
}

export interface InvestorFilters {
  investorType?: InvestorType[];
  kycStatus?: ComplianceStatus[];
  amlStatus?: ComplianceStatus[];
  jurisdiction?: string[];
  onboardedAfter?: Date;
  onboardedBefore?: Date;
}

export interface AccreditationEvidence {
  type: 'net_worth' | 'annual_income' | 'professional_certification' | 'institutional';
  verifiedBy: string;
  verificationDate: Date;
  documentHash?: string;
  netWorth?: number;
  annualIncome?: number;
  certification?: string;
}

export interface AccessCheckResult {
  allowed: boolean;
  investorId: string;
  assetId: string;
  reasons: string[];
  warnings: string[];
  requiredActions?: string[];
}

export interface OnboardingFilters {
  status?: InstitutionalOnboarding['status'][];
  organizationType?: InstitutionalOnboarding['organizationType'][];
  jurisdiction?: string[];
}

export interface AuditFilters {
  fromDate?: Date;
  toDate?: Date;
  investorType?: InvestorType[];
  complianceStatus?: ComplianceStatus[];
}

export interface RegulatoryAuditReport {
  generatedAt: Date;
  period: { from: Date; to: Date };
  totalInvestors: number;
  kycApproved: number;
  kycPending: number;
  kycRejected: number;
  amlApproved: number;
  amlFlagged: number;
  accreditedInvestors: number;
  institutionalOnboardings: number;
  jurisdictionBreakdown: Record<string, number>;
  complianceIssues: ComplianceIssue[];
}

export interface ComplianceIssue {
  investorId: string;
  issueType: 'expired_kyc' | 'expired_accreditation' | 'aml_flag' | 'jurisdiction_violation';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedAt: Date;
}

// ============================================================================
// Default Jurisdiction Rules
// ============================================================================

export const DEFAULT_JURISDICTION_RULES: JurisdictionRule[] = [
  {
    jurisdiction: 'US',
    allowedInvestorTypes: ['accredited', 'qualified_institutional'],
    requiredKycLevel: 'enhanced',
    maxInvestmentPerInvestor: 10000000,
    requiresAccreditation: true,
    restrictedAssetClasses: [],
    reportingRequirements: ['Form_D', 'Reg_D_506c'],
    holdingPeriod: 365, // 1 year lock-up
  },
  {
    jurisdiction: 'EU',
    allowedInvestorTypes: ['accredited', 'qualified_institutional', 'professional'],
    requiredKycLevel: 'enhanced',
    requiresAccreditation: false,
    restrictedAssetClasses: [],
    reportingRequirements: ['MiCA', 'MiFID_II', 'AIFMD'],
    holdingPeriod: 0,
  },
  {
    jurisdiction: 'UK',
    allowedInvestorTypes: ['accredited', 'qualified_institutional', 'professional'],
    requiredKycLevel: 'enhanced',
    requiresAccreditation: false,
    restrictedAssetClasses: [],
    reportingRequirements: ['FCA_Authorization', 'COBS'],
    holdingPeriod: 0,
  },
  {
    jurisdiction: 'SG',
    allowedInvestorTypes: ['accredited', 'qualified_institutional'],
    requiredKycLevel: 'enhanced',
    requiresAccreditation: true,
    restrictedAssetClasses: [],
    reportingRequirements: ['MAS_CMS', 'SFA'],
    holdingPeriod: 0,
  },
  {
    jurisdiction: 'CH',
    allowedInvestorTypes: ['retail', 'accredited', 'qualified_institutional', 'professional'],
    requiredKycLevel: 'basic',
    requiresAccreditation: false,
    restrictedAssetClasses: [],
    reportingRequirements: ['FINMA'],
    holdingPeriod: 0,
  },
];

// ============================================================================
// Default Compliance Manager
// ============================================================================

export class DefaultComplianceManager implements ComplianceManager {
  private _config: ComplianceConfig;
  private readonly investors: Map<string, InvestorProfile> = new Map();
  private readonly complianceChecks: Map<string, ComplianceCheck[]> = new Map();
  private readonly jurisdictionRules: Map<string, JurisdictionRule> = new Map();
  private readonly institutionalOnboardings: Map<string, InstitutionalOnboarding> = new Map();
  private readonly eventCallbacks: RWAEventCallback[] = [];

  constructor(config?: Partial<ComplianceConfig>) {
    this._config = {
      strictMode: true,
      kycRefreshDays: 365,
      amlMonitoringEnabled: true,
      accreditationRequired: true,
      ...config,
    };

    // Initialize default jurisdiction rules
    for (const rule of DEFAULT_JURISDICTION_RULES) {
      this.jurisdictionRules.set(rule.jurisdiction, rule);
    }
  }

  get config(): ComplianceConfig {
    return { ...this._config };
  }

  async createInvestorProfile(
    userId: string,
    investorType: InvestorType,
    details?: Partial<InvestorProfile>
  ): Promise<InvestorProfile> {
    const investorId = this.generateId('investor');

    const profile: InvestorProfile = {
      id: investorId,
      userId,
      investorType,
      kycLevel: 'basic',
      kycStatus: 'pending',
      amlStatus: 'pending',
      allowedJurisdictions: [],
      restrictedAssetClasses: [],
      regulatoryIds: {},
      onboardedAt: new Date(),
      lastReviewAt: new Date(),
      metadata: {},
      ...details,
    };

    this.investors.set(investorId, profile);
    this.complianceChecks.set(investorId, []);

    this.emitEvent('info', 'compliance', `Investor profile created: ${investorId}`, {
      investorId,
      investorType,
    });

    return { ...profile };
  }

  getInvestorProfile(investorId: string): InvestorProfile | undefined {
    const profile = this.investors.get(investorId);
    if (!profile) return undefined;
    return { ...profile };
  }

  async updateInvestorProfile(
    investorId: string,
    updates: Partial<InvestorProfile>
  ): Promise<InvestorProfile> {
    const profile = this.investors.get(investorId);
    if (!profile) {
      throw new Error(`Investor not found: ${investorId}`);
    }

    Object.assign(profile, updates);
    profile.lastReviewAt = new Date();

    return { ...profile };
  }

  listInvestors(filters?: InvestorFilters): InvestorProfile[] {
    let investors = Array.from(this.investors.values());

    if (filters) {
      if (filters.investorType?.length) {
        investors = investors.filter(i => filters.investorType!.includes(i.investorType));
      }
      if (filters.kycStatus?.length) {
        investors = investors.filter(i => filters.kycStatus!.includes(i.kycStatus));
      }
      if (filters.amlStatus?.length) {
        investors = investors.filter(i => filters.amlStatus!.includes(i.amlStatus));
      }
      if (filters.jurisdiction?.length) {
        investors = investors.filter(i =>
          i.allowedJurisdictions.some(j => filters.jurisdiction!.includes(j))
        );
      }
      if (filters.onboardedAfter) {
        investors = investors.filter(i => i.onboardedAt >= filters.onboardedAfter!);
      }
      if (filters.onboardedBefore) {
        investors = investors.filter(i => i.onboardedAt <= filters.onboardedBefore!);
      }
    }

    return investors.map(i => ({ ...i }));
  }

  async approveKyc(investorId: string, level: KycLevel): Promise<ComplianceCheck> {
    const profile = this.investors.get(investorId);
    if (!profile) {
      throw new Error(`Investor not found: ${investorId}`);
    }

    profile.kycStatus = 'approved';
    profile.kycLevel = level;
    profile.lastReviewAt = new Date();

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + this._config.kycRefreshDays);

    const check: ComplianceCheck = {
      id: this.generateId('check'),
      investorId,
      assetId: '*',
      checkType: 'kyc',
      status: 'approved',
      checkedAt: new Date(),
      validUntil: expiryDate,
    };

    this.addComplianceCheck(investorId, check);

    this.emitEvent('info', 'compliance', `KYC approved for investor: ${investorId}`, {
      investorId,
      level,
    });

    return { ...check };
  }

  async rejectKyc(investorId: string, reason: string): Promise<ComplianceCheck> {
    const profile = this.investors.get(investorId);
    if (!profile) {
      throw new Error(`Investor not found: ${investorId}`);
    }

    profile.kycStatus = 'rejected';
    profile.lastReviewAt = new Date();

    const check: ComplianceCheck = {
      id: this.generateId('check'),
      investorId,
      assetId: '*',
      checkType: 'kyc',
      status: 'rejected',
      reason,
      checkedAt: new Date(),
    };

    this.addComplianceCheck(investorId, check);

    this.emitEvent('warning', 'compliance', `KYC rejected for investor: ${investorId}`, {
      investorId,
      reason,
    });

    return { ...check };
  }

  async approveAml(investorId: string): Promise<ComplianceCheck> {
    const profile = this.investors.get(investorId);
    if (!profile) {
      throw new Error(`Investor not found: ${investorId}`);
    }

    profile.amlStatus = 'approved';
    profile.lastReviewAt = new Date();

    const check: ComplianceCheck = {
      id: this.generateId('check'),
      investorId,
      assetId: '*',
      checkType: 'aml',
      status: 'approved',
      checkedAt: new Date(),
    };

    this.addComplianceCheck(investorId, check);

    this.emitEvent('info', 'compliance', `AML approved for investor: ${investorId}`, {
      investorId,
    });

    return { ...check };
  }

  async rejectAml(investorId: string, reason: string): Promise<ComplianceCheck> {
    const profile = this.investors.get(investorId);
    if (!profile) {
      throw new Error(`Investor not found: ${investorId}`);
    }

    profile.amlStatus = 'rejected';
    profile.lastReviewAt = new Date();

    const check: ComplianceCheck = {
      id: this.generateId('check'),
      investorId,
      assetId: '*',
      checkType: 'aml',
      status: 'rejected',
      reason,
      checkedAt: new Date(),
    };

    this.addComplianceCheck(investorId, check);

    this.emitEvent('warning', 'compliance', `AML rejected for investor: ${investorId}`, {
      investorId,
      reason,
    });

    return { ...check };
  }

  getComplianceChecks(investorId: string): ComplianceCheck[] {
    return (this.complianceChecks.get(investorId) ?? []).map(c => ({ ...c }));
  }

  async verifyAccreditation(
    investorId: string,
    evidence: AccreditationEvidence
  ): Promise<ComplianceCheck> {
    const profile = this.investors.get(investorId);
    if (!profile) {
      throw new Error(`Investor not found: ${investorId}`);
    }

    // Verify accreditation criteria based on investor type
    let approved = false;
    let reason = '';

    switch (evidence.type) {
      case 'net_worth':
        approved = (evidence.netWorth ?? 0) >= 1000000; // $1M net worth threshold
        reason = approved ? '' : 'Net worth below $1M threshold';
        break;
      case 'annual_income':
        approved = (evidence.annualIncome ?? 0) >= 200000; // $200K income threshold
        reason = approved ? '' : 'Annual income below $200K threshold';
        break;
      case 'institutional':
        approved = true; // Institutional entities are automatically accredited
        break;
      case 'professional_certification':
        approved = !!evidence.certification;
        reason = approved ? '' : 'Invalid professional certification';
        break;
    }

    if (approved) {
      profile.accreditationStatus = 'approved';
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 2); // 2 year expiry
      profile.accreditationExpiry = expiryDate;

      if (evidence.netWorth) profile.netWorthVerified = true;
      if (evidence.annualIncome) profile.annualIncomeVerified = true;
    } else {
      profile.accreditationStatus = 'rejected';
    }

    const check: ComplianceCheck = {
      id: this.generateId('check'),
      investorId,
      assetId: '*',
      checkType: 'accreditation',
      status: approved ? 'approved' : 'rejected',
      reason: reason || undefined,
      checkedAt: new Date(),
      validUntil: profile.accreditationExpiry,
    };

    this.addComplianceCheck(investorId, check);

    this.emitEvent(
      approved ? 'info' : 'warning',
      'compliance',
      `Accreditation ${approved ? 'approved' : 'rejected'} for investor: ${investorId}`,
      { investorId, evidenceType: evidence.type }
    );

    return { ...check };
  }

  async revokeAccreditation(investorId: string, reason: string): Promise<void> {
    const profile = this.investors.get(investorId);
    if (!profile) {
      throw new Error(`Investor not found: ${investorId}`);
    }

    profile.accreditationStatus = 'rejected';
    profile.accreditationExpiry = undefined;
    profile.lastReviewAt = new Date();

    this.emitEvent('warning', 'compliance', `Accreditation revoked for investor: ${investorId}`, {
      investorId,
      reason,
    });
  }

  async checkInvestorAccess(
    investorId: string,
    assetId: string,
    assetClass: RWAAssetClass,
    jurisdiction: string,
    amount: number
  ): Promise<AccessCheckResult> {
    const profile = this.investors.get(investorId);
    const reasons: string[] = [];
    const warnings: string[] = [];
    const requiredActions: string[] = [];

    if (!profile) {
      return {
        allowed: false,
        investorId,
        assetId,
        reasons: ['Investor profile not found'],
        warnings: [],
        requiredActions: ['Create and complete KYC for investor'],
      };
    }

    // Check KYC status
    if (profile.kycStatus !== 'approved') {
      reasons.push(`KYC status is ${profile.kycStatus}`);
      requiredActions.push('Complete KYC verification');
    }

    // Check AML status
    if (profile.amlStatus !== 'approved') {
      reasons.push(`AML status is ${profile.amlStatus}`);
      requiredActions.push('Complete AML screening');
    }

    // Check jurisdiction rules
    const jurisdictionRule = this.jurisdictionRules.get(jurisdiction);
    if (jurisdictionRule) {
      if (!jurisdictionRule.allowedInvestorTypes.includes(profile.investorType)) {
        reasons.push(`Investor type ${profile.investorType} not allowed in ${jurisdiction}`);
      }

      const kycLevels: KycLevel[] = ['basic', 'enhanced', 'institutional'];
      const requiredLevel = jurisdictionRule.requiredKycLevel;
      const currentLevel = profile.kycLevel;
      if (kycLevels.indexOf(currentLevel) < kycLevels.indexOf(requiredLevel)) {
        reasons.push(`KYC level ${currentLevel} insufficient for ${jurisdiction} (requires ${requiredLevel})`);
        requiredActions.push(`Upgrade KYC to ${requiredLevel} level`);
      }

      if (jurisdictionRule.requiresAccreditation && profile.accreditationStatus !== 'approved') {
        reasons.push(`Accreditation required for ${jurisdiction}`);
        requiredActions.push('Complete accreditation verification');
      }

      if (jurisdictionRule.restrictedAssetClasses.includes(assetClass)) {
        reasons.push(`Asset class ${assetClass} is restricted in ${jurisdiction}`);
      }

      if (
        jurisdictionRule.maxInvestmentPerInvestor !== undefined &&
        amount > jurisdictionRule.maxInvestmentPerInvestor
      ) {
        reasons.push(
          `Investment amount ${amount} exceeds maximum ${jurisdictionRule.maxInvestmentPerInvestor} for ${jurisdiction}`
        );
      }
    }

    // Check restricted asset classes on investor profile
    if (profile.restrictedAssetClasses.includes(assetClass)) {
      reasons.push(`Asset class ${assetClass} is restricted for this investor`);
    }

    // Check maximum investment amount
    if (
      profile.maximumInvestmentAmount !== undefined &&
      amount > profile.maximumInvestmentAmount
    ) {
      reasons.push(
        `Amount ${amount} exceeds investor maximum ${profile.maximumInvestmentAmount}`
      );
    }

    // Check jurisdiction allowance
    if (
      profile.allowedJurisdictions.length > 0 &&
      !profile.allowedJurisdictions.includes(jurisdiction)
    ) {
      reasons.push(`Jurisdiction ${jurisdiction} not in allowed list for this investor`);
    }

    // Check accreditation expiry
    if (profile.accreditationStatus === 'approved' && profile.accreditationExpiry) {
      const daysUntilExpiry = Math.floor(
        (profile.accreditationExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiry < 30) {
        warnings.push(`Accreditation expires in ${daysUntilExpiry} days`);
      }
    }

    const allowed = reasons.length === 0;

    if (!allowed) {
      this.emitEvent('warning', 'compliance', `Access denied for investor ${investorId}`, {
        investorId,
        assetId,
        reasons,
      });
    }

    return {
      allowed,
      investorId,
      assetId,
      reasons,
      warnings,
      requiredActions: requiredActions.length > 0 ? requiredActions : undefined,
    };
  }

  addJurisdictionRule(rule: JurisdictionRule): void {
    this.jurisdictionRules.set(rule.jurisdiction, { ...rule });
    this.emitEvent('info', 'compliance', `Jurisdiction rule added: ${rule.jurisdiction}`, {
      jurisdiction: rule.jurisdiction,
    });
  }

  getJurisdictionRule(jurisdiction: string): JurisdictionRule | undefined {
    const rule = this.jurisdictionRules.get(jurisdiction);
    if (!rule) return undefined;
    return { ...rule };
  }

  listJurisdictionRules(): JurisdictionRule[] {
    return Array.from(this.jurisdictionRules.values()).map(r => ({ ...r }));
  }

  async submitInstitutionalOnboarding(
    request: Omit<InstitutionalOnboarding, 'id' | 'status' | 'submittedAt'>
  ): Promise<InstitutionalOnboarding> {
    const onboardingId = this.generateId('onboarding');

    const onboarding: InstitutionalOnboarding = {
      ...request,
      id: onboardingId,
      status: 'pending',
      submittedAt: new Date(),
    };

    this.institutionalOnboardings.set(onboardingId, onboarding);

    this.emitEvent('info', 'compliance', `Institutional onboarding submitted: ${request.organizationName}`, {
      onboardingId,
      organizationType: request.organizationType,
    });

    return { ...onboarding };
  }

  async reviewInstitutionalOnboarding(
    onboardingId: string,
    approved: boolean,
    reason?: string
  ): Promise<InstitutionalOnboarding> {
    const onboarding = this.institutionalOnboardings.get(onboardingId);
    if (!onboarding) {
      throw new Error(`Onboarding not found: ${onboardingId}`);
    }

    onboarding.status = approved ? 'approved' : 'rejected';
    onboarding.reviewedAt = new Date();
    if (approved) {
      onboarding.approvedAt = new Date();
    }
    if (reason) {
      onboarding.metadata = { ...onboarding.metadata, reviewReason: reason };
    }

    this.emitEvent(
      approved ? 'info' : 'warning',
      'compliance',
      `Institutional onboarding ${approved ? 'approved' : 'rejected'}: ${onboarding.organizationName}`,
      { onboardingId, approved }
    );

    return { ...onboarding };
  }

  getInstitutionalOnboarding(onboardingId: string): InstitutionalOnboarding | undefined {
    const onboarding = this.institutionalOnboardings.get(onboardingId);
    if (!onboarding) return undefined;
    return { ...onboarding };
  }

  listInstitutionalOnboardings(filters?: OnboardingFilters): InstitutionalOnboarding[] {
    let onboardings = Array.from(this.institutionalOnboardings.values());

    if (filters) {
      if (filters.status?.length) {
        onboardings = onboardings.filter(o => filters.status!.includes(o.status));
      }
      if (filters.organizationType?.length) {
        onboardings = onboardings.filter(o => filters.organizationType!.includes(o.organizationType));
      }
      if (filters.jurisdiction?.length) {
        onboardings = onboardings.filter(o => filters.jurisdiction!.includes(o.jurisdiction));
      }
    }

    return onboardings.map(o => ({ ...o }));
  }

  generateAuditReport(filters?: AuditFilters): RegulatoryAuditReport {
    const investors = Array.from(this.investors.values());
    const now = new Date();
    const fromDate = filters?.fromDate ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const toDate = filters?.toDate ?? now;

    const filteredInvestors = investors.filter(i => {
      if (filters?.investorType?.length && !filters.investorType.includes(i.investorType)) {
        return false;
      }
      return true;
    });

    const kycApproved = filteredInvestors.filter(i => i.kycStatus === 'approved').length;
    const kycPending = filteredInvestors.filter(i => i.kycStatus === 'pending').length;
    const kycRejected = filteredInvestors.filter(i => i.kycStatus === 'rejected').length;
    const amlApproved = filteredInvestors.filter(i => i.amlStatus === 'approved').length;
    const amlFlagged = filteredInvestors.filter(i => i.amlStatus === 'rejected').length;
    const accreditedInvestors = filteredInvestors.filter(
      i => i.accreditationStatus === 'approved'
    ).length;

    const institutionalOnboardings = Array.from(
      this.institutionalOnboardings.values()
    ).filter(o => o.submittedAt >= fromDate && o.submittedAt <= toDate).length;

    // Build jurisdiction breakdown
    const jurisdictionBreakdown: Record<string, number> = {};
    for (const investor of filteredInvestors) {
      for (const jurisdiction of investor.allowedJurisdictions) {
        jurisdictionBreakdown[jurisdiction] = (jurisdictionBreakdown[jurisdiction] ?? 0) + 1;
      }
    }

    // Find compliance issues
    const complianceIssues: ComplianceIssue[] = [];

    for (const investor of filteredInvestors) {
      // Check for expired KYC
      const kycChecks = (this.complianceChecks.get(investor.id) ?? []).filter(
        c => c.checkType === 'kyc' && c.status === 'approved'
      );
      const latestKyc = kycChecks[kycChecks.length - 1];
      if (latestKyc?.validUntil && latestKyc.validUntil < now) {
        complianceIssues.push({
          investorId: investor.id,
          issueType: 'expired_kyc',
          severity: 'high',
          description: `KYC expired on ${latestKyc.validUntil.toISOString()}`,
          detectedAt: now,
        });
      }

      // Check for expired accreditation
      if (investor.accreditationExpiry && investor.accreditationExpiry < now) {
        complianceIssues.push({
          investorId: investor.id,
          issueType: 'expired_accreditation',
          severity: 'medium',
          description: `Accreditation expired on ${investor.accreditationExpiry.toISOString()}`,
          detectedAt: now,
        });
      }

      // Check for AML flags
      if (investor.amlStatus === 'rejected') {
        complianceIssues.push({
          investorId: investor.id,
          issueType: 'aml_flag',
          severity: 'high',
          description: 'AML check failed',
          detectedAt: now,
        });
      }
    }

    return {
      generatedAt: now,
      period: { from: fromDate, to: toDate },
      totalInvestors: filteredInvestors.length,
      kycApproved,
      kycPending,
      kycRejected,
      amlApproved,
      amlFlagged,
      accreditedInvestors,
      institutionalOnboardings,
      jurisdictionBreakdown,
      complianceIssues,
    };
  }

  onEvent(callback: RWAEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addComplianceCheck(investorId: string, check: ComplianceCheck): void {
    const checks = this.complianceChecks.get(investorId) ?? [];
    checks.push(check);
    this.complianceChecks.set(investorId, checks);
  }

  private emitEvent(
    severity: 'info' | 'warning' | 'error' | 'critical',
    source: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: RWAEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'compliance_approved',
      severity,
      source,
      message,
      data,
      timestamp: new Date(),
    };

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

export function createComplianceManager(
  config?: Partial<ComplianceConfig>
): DefaultComplianceManager {
  return new DefaultComplianceManager(config);
}
