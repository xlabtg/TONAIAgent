/**
 * TONAIAgent - SGIA Regulatory Compatibility Layer
 *
 * Manages KYC/AML plug-in modules, jurisdiction-aware deployment profiles,
 * and regulatory compatibility matrices to ensure all institutional participants
 * meet the highest compliance standards across multiple jurisdictions.
 *
 * This is Domain 2 of the Sovereign-Grade Institutional Alignment (SGIA) framework.
 */

import {
  KycAmlModule,
  JurisdictionDeploymentProfile,
  KycVerificationStep,
  AmlRule,
  ReportingThreshold,
  KycModuleId,
  JurisdictionCode,
  KycAmlTier,
  FundClass,
  SovereignEntityType,
  SovereignEntityId,
  RegulatoryCompatibilityConfig,
  SGIAEvent,
  SGIAEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_REGULATORY_COMPATIBILITY_CONFIG: RegulatoryCompatibilityConfig = {
  enableKycAmlModules: true,
  enableJurisdictionAwareDeployment: true,
  defaultKycTier: 'enhanced',
  enableSanctionsScreening: true,
  enableRealTimeAml: true,
  kycRefreshIntervalDays: 365,
};

// ============================================================================
// Interface
// ============================================================================

export interface RegulatoryCompatibilityLayer {
  readonly config: RegulatoryCompatibilityConfig;

  // KYC/AML Modules
  registerKycModule(params: RegisterKycModuleParams): KycAmlModule;
  getKycModule(id: KycModuleId): KycAmlModule | undefined;
  getKycModuleByJurisdiction(jurisdiction: JurisdictionCode): KycAmlModule | undefined;
  listKycModules(filters?: KycModuleFilters): KycAmlModule[];
  addAmlRule(moduleId: KycModuleId, rule: Omit<AmlRule, 'id'>): AmlRule;
  addReportingThreshold(moduleId: KycModuleId, threshold: ReportingThreshold): void;
  deprecateKycModule(id: KycModuleId, reason: string): void;

  // Jurisdiction Deployment
  registerJurisdictionProfile(params: RegisterJurisdictionProfileParams): JurisdictionDeploymentProfile;
  getJurisdictionProfile(id: string): JurisdictionDeploymentProfile | undefined;
  getJurisdictionProfileByCode(jurisdiction: JurisdictionCode): JurisdictionDeploymentProfile | undefined;
  listJurisdictionProfiles(filters?: JurisdictionProfileFilters): JurisdictionDeploymentProfile[];
  updateJurisdictionProfile(id: string, updates: Partial<JurisdictionDeploymentProfile>): JurisdictionDeploymentProfile;

  // KYC Verification
  initiateKycVerification(params: KycVerificationParams): KycVerificationRecord;
  getKycRecord(id: string): KycVerificationRecord | undefined;
  listKycRecords(filters?: KycRecordFilters): KycVerificationRecord[];
  advanceKycStep(recordId: string, stepId: string, passed: boolean, notes?: string): KycVerificationRecord;
  completeKycVerification(recordId: string, tier: KycAmlTier): KycVerificationRecord;

  // Compliance Checking
  checkRegulatoryCompliance(entityId: SovereignEntityId, jurisdiction: JurisdictionCode): RegulatoryComplianceResult;

  // Events
  onEvent(callback: SGIAEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface RegisterKycModuleParams {
  name: string;
  jurisdiction: JurisdictionCode;
  kycTier: KycAmlTier;
  supportedEntityTypes: SovereignEntityType[];
  sanctionsLists?: string[];
  dataRetentionDays?: number;
}

export interface KycModuleFilters {
  jurisdiction?: JurisdictionCode;
  kycTier?: KycAmlTier;
  status?: KycAmlModule['status'];
  supportedEntityType?: SovereignEntityType;
}

export interface RegisterJurisdictionProfileParams {
  jurisdiction: JurisdictionCode;
  regulatoryFramework: string;
  complianceStatus: JurisdictionDeploymentProfile['complianceStatus'];
  requiredKycTier: KycAmlTier;
  supportedFundClasses: FundClass[];
  enabledFeatures?: string[];
  disabledFeatures?: string[];
}

export interface JurisdictionProfileFilters {
  complianceStatus?: JurisdictionDeploymentProfile['complianceStatus'];
  requiredKycTier?: KycAmlTier;
  supportedFundClass?: FundClass;
}

export interface KycVerificationParams {
  entityId: SovereignEntityId;
  entityType: SovereignEntityType;
  jurisdiction: JurisdictionCode;
  requestedTier: KycAmlTier;
}

export interface KycVerificationRecord {
  id: string;
  entityId: SovereignEntityId;
  entityType: SovereignEntityType;
  jurisdiction: JurisdictionCode;
  requestedTier: KycAmlTier;
  achievedTier?: KycAmlTier;
  moduleId?: KycModuleId;
  stepResults: KycStepResult[];
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'expired';
  initiatedAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
}

export interface KycStepResult {
  stepId: string;
  stepName: string;
  passed: boolean;
  notes?: string;
  completedAt: Date;
}

export interface KycRecordFilters {
  entityId?: SovereignEntityId;
  jurisdiction?: JurisdictionCode;
  status?: KycVerificationRecord['status'];
  achievedTier?: KycAmlTier;
}

export interface RegulatoryComplianceResult {
  entityId: SovereignEntityId;
  jurisdiction: JurisdictionCode;
  isCompliant: boolean;
  complianceScore: number; // 0-100
  kycStatus: 'verified' | 'pending' | 'expired' | 'not_started';
  kycTier?: KycAmlTier;
  violations: string[];
  warnings: string[];
  requiredActions: string[];
  assessedAt: Date;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultRegulatoryCompatibilityLayer implements RegulatoryCompatibilityLayer {
  readonly config: RegulatoryCompatibilityConfig;

  private readonly kycModules = new Map<KycModuleId, KycAmlModule>();
  private readonly kycModulesByJurisdiction = new Map<JurisdictionCode, KycModuleId>();
  private readonly jurisdictionProfiles = new Map<string, JurisdictionDeploymentProfile>();
  private readonly jurisdictionProfilesByCode = new Map<JurisdictionCode, string>();
  private readonly kycRecords = new Map<string, KycVerificationRecord>();
  private readonly verifiedEntities = new Map<SovereignEntityId, KycVerificationRecord>();
  private readonly eventCallbacks: SGIAEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<RegulatoryCompatibilityConfig>) {
    this.config = { ...DEFAULT_REGULATORY_COMPATIBILITY_CONFIG, ...config };
  }

  // ============================================================================
  // KYC/AML Modules
  // ============================================================================

  registerKycModule(params: RegisterKycModuleParams): KycAmlModule {
    const defaultSteps: KycVerificationStep[] = [
      {
        stepId: 'identity_verification',
        stepName: 'Identity Verification',
        required: true,
        documentTypes: ['passport', 'national_id', 'corporate_registration'],
        automationLevel: 'semi_automated',
        estimatedProcessingHours: 24,
      },
      {
        stepId: 'sanctions_screening',
        stepName: 'Sanctions Screening',
        required: true,
        documentTypes: [],
        automationLevel: 'fully_automated',
        estimatedProcessingHours: 1,
      },
      {
        stepId: 'source_of_funds',
        stepName: 'Source of Funds Verification',
        required: params.kycTier !== 'standard',
        documentTypes: ['audited_financials', 'fund_prospectus', 'regulatory_filing'],
        automationLevel: 'manual',
        estimatedProcessingHours: 72,
      },
    ];

    const module: KycAmlModule = {
      id: this.generateId('kyc'),
      name: params.name,
      jurisdiction: params.jurisdiction,
      kycTier: params.kycTier,
      supportedEntityTypes: params.supportedEntityTypes,
      verificationSteps: defaultSteps,
      sanctionsLists: params.sanctionsLists ?? ['OFAC', 'UN', 'EU', 'FATF'],
      amlRules: [],
      reportingThresholds: [],
      dataRetentionDays: params.dataRetentionDays ?? 2555, // ~7 years
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.kycModules.set(module.id, module);
    this.kycModulesByJurisdiction.set(params.jurisdiction, module.id);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'kyc_module_registered',
      severity: 'info',
      source: 'RegulatoryCompatibilityLayer',
      message: `KYC/AML module registered: ${params.name} for ${params.jurisdiction}`,
      data: { moduleId: module.id, jurisdiction: params.jurisdiction, tier: params.kycTier },
      timestamp: new Date(),
    });

    return module;
  }

  getKycModule(id: KycModuleId): KycAmlModule | undefined {
    return this.kycModules.get(id);
  }

  getKycModuleByJurisdiction(jurisdiction: JurisdictionCode): KycAmlModule | undefined {
    const id = this.kycModulesByJurisdiction.get(jurisdiction);
    return id ? this.kycModules.get(id) : undefined;
  }

  listKycModules(filters?: KycModuleFilters): KycAmlModule[] {
    let results = Array.from(this.kycModules.values());

    if (filters?.jurisdiction) results = results.filter(m => m.jurisdiction === filters.jurisdiction);
    if (filters?.kycTier) results = results.filter(m => m.kycTier === filters.kycTier);
    if (filters?.status) results = results.filter(m => m.status === filters.status);
    if (filters?.supportedEntityType) {
      results = results.filter(m => m.supportedEntityTypes.includes(filters.supportedEntityType!));
    }

    return results;
  }

  addAmlRule(moduleId: KycModuleId, rule: Omit<AmlRule, 'id'>): AmlRule {
    const module = this.kycModules.get(moduleId);
    if (!module) throw new Error(`KYC module not found: ${moduleId}`);

    const newRule: AmlRule = {
      ...rule,
      id: this.generateId('aml'),
    };

    module.amlRules.push(newRule);
    module.updatedAt = new Date();
    return newRule;
  }

  addReportingThreshold(moduleId: KycModuleId, threshold: ReportingThreshold): void {
    const module = this.kycModules.get(moduleId);
    if (!module) throw new Error(`KYC module not found: ${moduleId}`);

    module.reportingThresholds.push(threshold);
    module.updatedAt = new Date();
  }

  deprecateKycModule(id: KycModuleId, reason: string): void {
    const module = this.kycModules.get(id);
    if (!module) throw new Error(`KYC module not found: ${id}`);

    module.status = 'deprecated';
    module.updatedAt = new Date();
    void reason;
  }

  // ============================================================================
  // Jurisdiction Deployment Profiles
  // ============================================================================

  registerJurisdictionProfile(params: RegisterJurisdictionProfileParams): JurisdictionDeploymentProfile {
    const profile: JurisdictionDeploymentProfile = {
      id: this.generateId('jdp'),
      jurisdiction: params.jurisdiction,
      regulatoryFramework: params.regulatoryFramework,
      complianceStatus: params.complianceStatus,
      requiredKycTier: params.requiredKycTier,
      supportedFundClasses: params.supportedFundClasses,
      enabledFeatures: params.enabledFeatures ?? [],
      disabledFeatures: params.disabledFeatures ?? [],
      reportingRequirements: [],
      effectiveDate: new Date(),
      reviewDate: new Date(Date.now() + 365 * 86400000),
    };

    this.jurisdictionProfiles.set(profile.id, profile);
    this.jurisdictionProfilesByCode.set(params.jurisdiction, profile.id);
    return profile;
  }

  getJurisdictionProfile(id: string): JurisdictionDeploymentProfile | undefined {
    return this.jurisdictionProfiles.get(id);
  }

  getJurisdictionProfileByCode(jurisdiction: JurisdictionCode): JurisdictionDeploymentProfile | undefined {
    const id = this.jurisdictionProfilesByCode.get(jurisdiction);
    return id ? this.jurisdictionProfiles.get(id) : undefined;
  }

  listJurisdictionProfiles(filters?: JurisdictionProfileFilters): JurisdictionDeploymentProfile[] {
    let results = Array.from(this.jurisdictionProfiles.values());

    if (filters?.complianceStatus) results = results.filter(p => p.complianceStatus === filters.complianceStatus);
    if (filters?.requiredKycTier) results = results.filter(p => p.requiredKycTier === filters.requiredKycTier);
    if (filters?.supportedFundClass) {
      results = results.filter(p => p.supportedFundClasses.includes(filters.supportedFundClass!));
    }

    return results;
  }

  updateJurisdictionProfile(id: string, updates: Partial<JurisdictionDeploymentProfile>): JurisdictionDeploymentProfile {
    const profile = this.jurisdictionProfiles.get(id);
    if (!profile) throw new Error(`Jurisdiction profile not found: ${id}`);

    Object.assign(profile, updates, { id });
    return profile;
  }

  // ============================================================================
  // KYC Verification
  // ============================================================================

  initiateKycVerification(params: KycVerificationParams): KycVerificationRecord {
    const module = this.getKycModuleByJurisdiction(params.jurisdiction);

    const record: KycVerificationRecord = {
      id: this.generateId('kycr'),
      entityId: params.entityId,
      entityType: params.entityType,
      jurisdiction: params.jurisdiction,
      requestedTier: params.requestedTier,
      moduleId: module?.id,
      stepResults: [],
      status: 'in_progress',
      initiatedAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.kycRefreshIntervalDays * 86400000),
    };

    this.kycRecords.set(record.id, record);
    return record;
  }

  getKycRecord(id: string): KycVerificationRecord | undefined {
    return this.kycRecords.get(id);
  }

  listKycRecords(filters?: KycRecordFilters): KycVerificationRecord[] {
    let results = Array.from(this.kycRecords.values());

    if (filters?.entityId) results = results.filter(r => r.entityId === filters.entityId);
    if (filters?.jurisdiction) results = results.filter(r => r.jurisdiction === filters.jurisdiction);
    if (filters?.status) results = results.filter(r => r.status === filters.status);
    if (filters?.achievedTier) results = results.filter(r => r.achievedTier === filters.achievedTier);

    return results;
  }

  advanceKycStep(recordId: string, stepId: string, passed: boolean, notes?: string): KycVerificationRecord {
    const record = this.kycRecords.get(recordId);
    if (!record) throw new Error(`KYC record not found: ${recordId}`);

    record.stepResults.push({
      stepId,
      stepName: stepId,
      passed,
      notes,
      completedAt: new Date(),
    });

    if (!passed) {
      record.status = 'rejected';
    }

    return record;
  }

  completeKycVerification(recordId: string, tier: KycAmlTier): KycVerificationRecord {
    const record = this.kycRecords.get(recordId);
    if (!record) throw new Error(`KYC record not found: ${recordId}`);

    record.achievedTier = tier;
    record.status = 'completed';
    record.completedAt = new Date();

    this.verifiedEntities.set(record.entityId, record);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'kyc_verified',
      severity: 'info',
      source: 'RegulatoryCompatibilityLayer',
      message: `KYC verification completed for entity ${record.entityId} at tier ${tier}`,
      data: { recordId, entityId: record.entityId, tier, jurisdiction: record.jurisdiction },
      timestamp: new Date(),
    });

    return record;
  }

  // ============================================================================
  // Compliance Checking
  // ============================================================================

  checkRegulatoryCompliance(entityId: SovereignEntityId, jurisdiction: JurisdictionCode): RegulatoryComplianceResult {
    const violations: string[] = [];
    const warnings: string[] = [];
    const requiredActions: string[] = [];

    const jurisdictionProfile = this.getJurisdictionProfileByCode(jurisdiction);
    const verifiedRecord = this.verifiedEntities.get(entityId);
    const latestKycRecord = Array.from(this.kycRecords.values())
      .filter(r => r.entityId === entityId && r.jurisdiction === jurisdiction)
      .sort((a, b) => b.initiatedAt.getTime() - a.initiatedAt.getTime())[0];

    // Check jurisdiction compliance status
    if (!jurisdictionProfile) {
      violations.push(`No jurisdiction profile registered for ${jurisdiction}`);
      requiredActions.push(`Register jurisdiction deployment profile for ${jurisdiction}`);
    } else if (jurisdictionProfile.complianceStatus === 'prohibited') {
      violations.push(`Operations prohibited in jurisdiction: ${jurisdiction}`);
    } else if (jurisdictionProfile.complianceStatus === 'restricted') {
      warnings.push(`Operations are restricted in jurisdiction: ${jurisdiction}`);
    }

    // Check KYC status
    let kycStatus: RegulatoryComplianceResult['kycStatus'] = 'not_started';
    let kycTier: KycAmlTier | undefined;

    if (verifiedRecord && verifiedRecord.status === 'completed') {
      const expiresAt = verifiedRecord.expiresAt;
      if (expiresAt && expiresAt < new Date()) {
        kycStatus = 'expired';
        warnings.push('KYC verification has expired');
        requiredActions.push('Renew KYC verification');
      } else {
        kycStatus = 'verified';
        kycTier = verifiedRecord.achievedTier;
      }
    } else if (latestKycRecord && latestKycRecord.status === 'in_progress') {
      kycStatus = 'pending';
      warnings.push('KYC verification is still in progress');
    } else {
      violations.push('KYC verification not completed');
      requiredActions.push('Complete KYC verification');
    }

    // Compute score
    let score = 100;
    score -= violations.length * 30;
    score -= warnings.length * 10;
    score = Math.max(0, score);

    return {
      entityId,
      jurisdiction,
      isCompliant: violations.length === 0,
      complianceScore: score,
      kycStatus,
      kycTier,
      violations,
      warnings,
      requiredActions,
      assessedAt: new Date(),
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: SGIAEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: SGIAEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRegulatoryCompatibilityLayer(
  config?: Partial<RegulatoryCompatibilityConfig>
): DefaultRegulatoryCompatibilityLayer {
  return new DefaultRegulatoryCompatibilityLayer(config);
}

export default DefaultRegulatoryCompatibilityLayer;
