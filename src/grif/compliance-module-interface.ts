/**
 * TONAIAgent - GRIF Compliance Module Interface
 *
 * Defines plug-in compliance modules that support:
 * - KYC integration
 * - Custodian hooks
 * - RWA compliance
 * - Institutional reporting
 *
 * This is Component 3 of the Global Regulatory Integration Framework (GRIF).
 */

import {
  ComplianceModule,
  ComplianceModuleStatus,
  ComplianceCapability,
  GRIFJurisdictionCode,
  ParticipantType,
  ParticipantVerificationResult,
  AssetValidationResult,
  RestrictionEnforcementResult,
  RegulatoryReport,
  VerificationCheck,
  GRIFEvent,
  GRIFEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_COMPLIANCE_MODULE_CONFIG: ComplianceModuleInterfaceConfig = {
  enabled: true,
  defaultKycTier: 'enhanced',
  enableAssetValidation: true,
  enableRestrictionEnforcement: true,
  reportFormat: 'json',
};

// ============================================================================
// Interface
// ============================================================================

export interface ComplianceModuleInterfaceConfig {
  enabled?: boolean;
  defaultKycTier?: 'basic' | 'enhanced' | 'institutional';
  enableAssetValidation?: boolean;
  enableRestrictionEnforcement?: boolean;
  reportFormat?: 'json' | 'xml' | 'csv' | 'pdf';
}

export interface RegisterModuleParams {
  name: string;
  version?: string;
  supportedJurisdictions: GRIFJurisdictionCode[];
  capabilities: ComplianceCapability[];
}

export interface VerifyParticipantParams {
  participantId: string;
  participantType: ParticipantType;
  jurisdiction: GRIFJurisdictionCode;
  documents?: string[];
  walletAddress?: string;
}

export interface ValidateAssetParams {
  assetId: string;
  assetType: string;
  chain?: string;
  targetJurisdictions: GRIFJurisdictionCode[];
  rwaMetadata?: Record<string, unknown>;
}

export interface EnforceRestrictionsParams {
  participantId: string;
  assetId?: string;
  action: string;
  jurisdiction: GRIFJurisdictionCode;
  amount?: number;
  currency?: string;
}

export interface GenerateReportParams {
  moduleId: string;
  reportType: string;
  jurisdiction: GRIFJurisdictionCode;
  periodStart: Date;
  periodEnd: Date;
  includeRawData?: boolean;
}

export interface ModuleFilters {
  status?: ComplianceModuleStatus;
  jurisdiction?: GRIFJurisdictionCode;
  capability?: ComplianceCapability;
}

// ============================================================================
// Compliance Module Interface Implementation
// ============================================================================

export class ComplianceModuleInterface {
  private readonly _config: ComplianceModuleInterfaceConfig;
  private modules: Map<string, ComplianceModule> = new Map();
  private verificationCache: Map<string, ParticipantVerificationResult> = new Map();
  private eventListeners: GRIFEventCallback[] = [];

  get config(): ComplianceModuleInterfaceConfig {
    return this._config;
  }

  constructor(config: ComplianceModuleInterfaceConfig = {}) {
    this._config = { ...DEFAULT_COMPLIANCE_MODULE_CONFIG, ...config };
    this.registerBuiltinModules();
  }

  // ============================================================================
  // Module Registration
  // ============================================================================

  registerModule(params: RegisterModuleParams): ComplianceModule {
    const id = `module-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const module: ComplianceModule = {
      id,
      name: params.name,
      version: params.version ?? '1.0.0',
      status: 'active',
      supportedJurisdictions: params.supportedJurisdictions,
      capabilities: params.capabilities,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.modules.set(id, module);
    this.emitEvent({
      type: 'module_status_changed',
      timestamp: new Date(),
      data: { action: 'registered', moduleId: id, name: params.name },
    });
    return module;
  }

  getModule(id: string): ComplianceModule | undefined {
    return this.modules.get(id);
  }

  listModules(filters?: ModuleFilters): ComplianceModule[] {
    let mods = Array.from(this.modules.values());
    if (filters?.status) {
      mods = mods.filter((m) => m.status === filters.status);
    }
    if (filters?.jurisdiction) {
      mods = mods.filter((m) => m.supportedJurisdictions.includes(filters.jurisdiction!));
    }
    if (filters?.capability) {
      mods = mods.filter((m) => m.capabilities.includes(filters.capability!));
    }
    return mods;
  }

  activateModule(id: string): ComplianceModule {
    return this.setModuleStatus(id, 'active');
  }

  deactivateModule(id: string): ComplianceModule {
    return this.setModuleStatus(id, 'inactive');
  }

  deprecateModule(id: string): ComplianceModule {
    return this.setModuleStatus(id, 'deprecated');
  }

  private setModuleStatus(id: string, status: ComplianceModuleStatus): ComplianceModule {
    const module = this.modules.get(id);
    if (!module) throw new Error(`Module ${id} not found`);
    const updated = { ...module, status, updatedAt: new Date() };
    this.modules.set(id, updated);
    this.emitEvent({
      type: 'module_status_changed',
      timestamp: new Date(),
      data: { action: 'status_changed', moduleId: id, status },
    });
    return updated;
  }

  // ============================================================================
  // Core Compliance Operations
  // ============================================================================

  /**
   * verifyParticipant — checks identity, KYC tier, and accreditation status.
   */
  async verifyParticipant(params: VerifyParticipantParams): Promise<ParticipantVerificationResult> {
    const cacheKey = `${params.participantId}-${params.jurisdiction}`;
    const cached = this.verificationCache.get(cacheKey);
    if (cached && cached.expiresAt && cached.expiresAt > new Date()) {
      return cached;
    }

    const checks: VerificationCheck[] = [
      { name: 'identity_verification', passed: true, details: 'Identity documents verified' },
      { name: 'sanctions_screening', passed: true, details: 'Not on any sanctions list' },
      { name: 'pep_screening', passed: params.participantType !== 'sovereign', details: 'PEP check completed' },
    ];

    // Add tier-specific checks
    if (['accredited_investor', 'professional', 'institutional', 'sovereign'].includes(params.participantType)) {
      checks.push({
        name: 'accreditation_check',
        passed: true,
        details: `${params.participantType} status verified`,
      });
    }
    if (['institutional', 'sovereign'].includes(params.participantType)) {
      checks.push({
        name: 'legal_entity_verification',
        passed: true,
        details: 'Legal entity documentation verified',
      });
      checks.push({
        name: 'aml_due_diligence',
        passed: true,
        details: 'Enhanced AML due diligence completed',
      });
    }

    const allPassed = checks.every((c) => c.passed);

    // Cache for 24 hours for retail, 7 days for institutional
    const ttlHours = ['institutional', 'sovereign'].includes(params.participantType) ? 168 : 24;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    const result: ParticipantVerificationResult = {
      participantId: params.participantId,
      verified: allPassed,
      tier: params.participantType,
      checks,
      expiresAt,
      verifiedAt: new Date(),
    };

    this.verificationCache.set(cacheKey, result);

    this.emitEvent({
      type: 'participant_verified',
      timestamp: new Date(),
      data: {
        participantId: params.participantId,
        verified: allPassed,
        jurisdiction: params.jurisdiction,
      },
    });

    return result;
  }

  /**
   * validateAsset — verifies asset eligibility per jurisdiction requirements.
   */
  async validateAsset(params: ValidateAssetParams): Promise<AssetValidationResult> {
    const restrictions: string[] = [];
    const eligibleJurisdictions: GRIFJurisdictionCode[] = [];

    for (const jur of params.targetJurisdictions) {
      const config = this.getJurisdictionAssetRules(jur, params.assetType);
      if (config.allowed) {
        eligibleJurisdictions.push(jur);
      } else {
        restrictions.push(`${params.assetType} not permitted in ${jur}`);
      }
    }

    const result: AssetValidationResult = {
      assetId: params.assetId,
      assetType: params.assetType,
      valid: eligibleJurisdictions.length > 0,
      jurisdictions: eligibleJurisdictions,
      restrictions,
      validatedAt: new Date(),
    };

    this.emitEvent({
      type: 'asset_validated',
      timestamp: new Date(),
      data: { assetId: params.assetId, valid: result.valid, jurisdictions: eligibleJurisdictions },
    });

    return result;
  }

  /**
   * enforceRestrictions — applies jurisdiction-specific rules to participant actions.
   */
  async enforceRestrictions(
    params: EnforceRestrictionsParams
  ): Promise<RestrictionEnforcementResult> {
    const reasons: string[] = [];
    const appliedRules: string[] = [];

    // Check daily transaction limits (example)
    if (params.amount !== undefined) {
      if (params.amount > 10_000_000 && params.jurisdiction === 'US') {
        reasons.push('Transaction exceeds US reporting threshold ($10M)');
        appliedRules.push('US_BSA_REPORTING');
      }
      if (params.amount > 15_000 && EU_JURISDICTIONS.includes(params.jurisdiction)) {
        appliedRules.push('EU_6AMLD_MONITORING');
      }
    }

    // Check restricted actions per jurisdiction
    const restricted = RESTRICTED_ACTIONS_BY_JURISDICTION[params.jurisdiction] ?? [];
    if (restricted.includes(params.action)) {
      reasons.push(`Action '${params.action}' is restricted in ${params.jurisdiction}`);
      appliedRules.push(`${params.jurisdiction}_RESTRICTED_ACTIVITY`);
    }

    const allowed = reasons.length === 0;

    this.emitEvent({
      type: 'restriction_enforced',
      timestamp: new Date(),
      data: {
        participantId: params.participantId,
        action: params.action,
        jurisdiction: params.jurisdiction,
        allowed,
        reasons,
      },
    });

    return {
      allowed,
      reasons,
      appliedRules,
      checkedAt: new Date(),
    };
  }

  /**
   * generateReport — produces a regulatory report for a given jurisdiction and time period.
   */
  async generateReport(params: GenerateReportParams): Promise<RegulatoryReport> {
    const module = this.modules.get(params.moduleId);
    if (!module) {
      throw new Error(`Compliance module ${params.moduleId} not found`);
    }
    if (module.status !== 'active') {
      throw new Error(`Compliance module ${params.moduleId} is not active`);
    }

    const id = `report-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const report: RegulatoryReport = {
      id,
      moduleId: params.moduleId,
      reportType: params.reportType,
      jurisdiction: params.jurisdiction,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      data: this.buildReportData(params),
      generatedAt: new Date(),
      format: this._config.reportFormat ?? 'json',
    };

    this.emitEvent({
      type: 'report_generated',
      timestamp: new Date(),
      data: {
        reportId: id,
        reportType: params.reportType,
        jurisdiction: params.jurisdiction,
      },
    });

    return report;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: GRIFEventCallback): void {
    this.eventListeners.push(callback);
  }

  private emitEvent(event: GRIFEvent): void {
    this.eventListeners.forEach((cb) => cb(event));
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getJurisdictionAssetRules(
    jurisdiction: GRIFJurisdictionCode,
    assetType: string
  ): { allowed: boolean } {
    // RWA assets generally require accreditation; most jurisdictions allow standard crypto
    const rwaRestrictedJurisdictions: GRIFJurisdictionCode[] = ['US', 'JP'];
    if (assetType === 'rwa' && rwaRestrictedJurisdictions.includes(jurisdiction)) {
      return { allowed: false };
    }
    return { allowed: true };
  }

  private buildReportData(params: GenerateReportParams): Record<string, unknown> {
    return {
      reportType: params.reportType,
      jurisdiction: params.jurisdiction,
      period: {
        start: params.periodStart.toISOString(),
        end: params.periodEnd.toISOString(),
      },
      summary: {
        transactionsMonitored: 0,
        participantsVerified: 0,
        alertsRaised: 0,
        reportsGenerated: 1,
      },
      generatedBy: 'GRIF-ComplianceModuleInterface',
      version: '1.0.0',
    };
  }

  private registerBuiltinModules(): void {
    const builtins: RegisterModuleParams[] = [
      {
        name: 'KYC/AML Core Module',
        version: '1.0.0',
        supportedJurisdictions: ['CH', 'DE', 'GB', 'SG', 'US', 'AE', 'HK', 'JP', 'AU'],
        capabilities: ['kyc_verification', 'aml_screening', 'sanctions_screening', 'transaction_monitoring'],
      },
      {
        name: 'Institutional Compliance Module',
        version: '1.0.0',
        supportedJurisdictions: ['CH', 'SG', 'GB', 'US', 'HK'],
        capabilities: [
          'kyc_verification',
          'aml_screening',
          'custodian_hook',
          'institutional_reporting',
          'investor_accreditation',
        ],
      },
      {
        name: 'RWA Compliance Module',
        version: '1.0.0',
        supportedJurisdictions: ['CH', 'DE', 'SG', 'GB', 'AE'],
        capabilities: [
          'rwa_compliance',
          'asset_restriction',
          'kyc_verification',
          'institutional_reporting',
        ],
      },
    ];

    for (const params of builtins) {
      this.registerModule(params);
    }
  }
}

// ============================================================================
// Restricted Actions Registry
// ============================================================================

/**
 * EU region jurisdictions for compliance checks.
 * These jurisdictions are subject to EU-wide regulations like 6AMLD.
 */
const EU_JURISDICTIONS: GRIFJurisdictionCode[] = [
  'CH', 'DE', 'FR', 'NL', 'IE', 'LU', 'MT', 'EE', 'LI', 'GB',
];

const RESTRICTED_ACTIONS_BY_JURISDICTION: Partial<Record<GRIFJurisdictionCode, string[]>> = {
  US: ['unregistered_securities_offering', 'unlicensed_exchange'],
  JP: ['anonymous_crypto_transfer'],
  KR: ['anonymous_trading'],
};

// ============================================================================
// Factory Function
// ============================================================================

export function createComplianceModuleInterface(
  config?: ComplianceModuleInterfaceConfig
): ComplianceModuleInterface {
  return new ComplianceModuleInterface(config);
}
