/**
 * TONAIAgent - Jurisdiction-Aware Deployment
 *
 * Implements region-specific compliance configuration:
 * - Jurisdiction profiles (EU, US, UK, Asia, Middle East, etc.)
 * - Regulatory framework support (MiCA, MiFID II, SEC, CFTC, FCA, MAS, VARA)
 * - Data residency and GDPR compliance
 * - KYC requirements by jurisdiction
 * - Regulatory reporting requirements
 * - Travel Rule compliance (FATF)
 */

import {
  JurisdictionProfile,
  Jurisdiction,
  RegulatoryFramework,
  DataResidencyConfig,
  RegulatoryReportingRequirement,
  JurisdictionRestriction,
  JurisdictionKycRequirements,
  ReportFrequency,
  KycLevel,
  DocumentType,
  InstitutionalEventCallback,
  InstitutionalEvent,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface JurisdictionManager {
  // Profile management
  createProfile(
    accountId: string,
    jurisdiction: Jurisdiction,
    frameworks: RegulatoryFramework[],
    options?: JurisdictionProfileOptions
  ): Promise<JurisdictionProfile>;
  getProfile(accountId: string, jurisdiction: Jurisdiction): Promise<JurisdictionProfile | null>;
  listProfiles(accountId: string): Promise<JurisdictionProfile[]>;
  updateProfile(
    profileId: string,
    updates: Partial<JurisdictionProfileUpdates>
  ): Promise<JurisdictionProfile>;
  enableProfile(profileId: string): Promise<JurisdictionProfile>;
  disableProfile(profileId: string): Promise<JurisdictionProfile>;

  // Data residency
  updateDataResidency(
    profileId: string,
    config: Partial<DataResidencyConfig>
  ): Promise<JurisdictionProfile>;
  isDataResidencyCompliant(
    profileId: string,
    dataRegion: string
  ): Promise<DataResidencyCheckResult>;

  // Regulatory reporting
  addReportingRequirement(
    profileId: string,
    requirement: RegulatoryReportingRequirement
  ): Promise<JurisdictionProfile>;
  getReportingRequirements(
    profileId: string,
    framework?: RegulatoryFramework
  ): Promise<RegulatoryReportingRequirement[]>;
  getDueReports(profileId: string): Promise<DueReport[]>;

  // Restrictions
  addRestriction(
    profileId: string,
    restriction: JurisdictionRestriction
  ): Promise<JurisdictionProfile>;
  checkAssetAllowed(
    profileId: string,
    asset: string
  ): Promise<AssetAllowanceResult>;
  checkServiceAllowed(
    profileId: string,
    service: string
  ): Promise<ServiceAllowanceResult>;

  // KYC requirements
  getKycRequirements(
    accountId: string,
    jurisdiction: Jurisdiction
  ): Promise<JurisdictionKycRequirements>;
  isKycCompliant(
    accountId: string,
    jurisdiction: Jurisdiction,
    currentKycLevel: KycLevel,
    documents: DocumentType[]
  ): Promise<KycComplianceCheckResult>;

  // Multi-jurisdiction
  getApplicableFrameworks(accountId: string): Promise<RegulatoryFramework[]>;
  getStrictestKycRequirements(accountId: string): Promise<JurisdictionKycRequirements>;

  // Events
  onEvent(callback: InstitutionalEventCallback): void;
}

export interface JurisdictionProfileOptions {
  dataResidency?: Partial<DataResidencyConfig>;
  reportingRequirements?: RegulatoryReportingRequirement[];
  restrictions?: JurisdictionRestriction[];
  kycRequirements?: Partial<JurisdictionKycRequirements>;
}

export interface JurisdictionProfileUpdates {
  frameworks: RegulatoryFramework[];
  dataResidency: Partial<DataResidencyConfig>;
  kycRequirements: Partial<JurisdictionKycRequirements>;
  enabled: boolean;
}

export interface DataResidencyCheckResult {
  compliant: boolean;
  region: string;
  allowedRegions: string[];
  prohibitedRegions: string[];
  reason?: string;
}

export interface DueReport {
  profileId: string;
  framework: RegulatoryFramework;
  reportType: string;
  dueDate: Date;
  recipient: string;
  overdue: boolean;
}

export interface AssetAllowanceResult {
  allowed: boolean;
  restrictions: JurisdictionRestriction[];
  requiresLicense: boolean;
  licenseTypes: string[];
  reason?: string;
}

export interface ServiceAllowanceResult {
  allowed: boolean;
  restrictions: JurisdictionRestriction[];
  requiresLicense: boolean;
  licenseTypes: string[];
  reason?: string;
}

export interface KycComplianceCheckResult {
  compliant: boolean;
  requiredLevel: KycLevel;
  currentLevel: KycLevel;
  missingDocuments: DocumentType[];
  additionalRequirements: string[];
  reason?: string;
}

// ============================================================================
// Default KYC Requirements by Jurisdiction
// ============================================================================

const DEFAULT_KYC_REQUIREMENTS: Record<Jurisdiction, JurisdictionKycRequirements> = {
  EU: {
    minimumKycLevel: 'enhanced',
    additionalDocuments: ['articles_of_incorporation', 'beneficial_ownership'],
    localIdRequired: false,
    businessRegistrationRequired: true,
    beneficialOwnershipThreshold: 25,
    pepScreeningRequired: true,
    adverseMediaRequired: true,
    enhancedDueDiligenceThreshold: 15000,
  },
  US: {
    minimumKycLevel: 'enhanced',
    additionalDocuments: ['articles_of_incorporation', 'beneficial_ownership', 'tax_identification'],
    localIdRequired: true,
    businessRegistrationRequired: true,
    beneficialOwnershipThreshold: 25,
    pepScreeningRequired: true,
    adverseMediaRequired: true,
    enhancedDueDiligenceThreshold: 10000,
  },
  UK: {
    minimumKycLevel: 'enhanced',
    additionalDocuments: ['articles_of_incorporation', 'beneficial_ownership'],
    localIdRequired: false,
    businessRegistrationRequired: true,
    beneficialOwnershipThreshold: 25,
    pepScreeningRequired: true,
    adverseMediaRequired: true,
    enhancedDueDiligenceThreshold: 15000,
  },
  Asia: {
    minimumKycLevel: 'standard',
    additionalDocuments: ['articles_of_incorporation'],
    localIdRequired: false,
    businessRegistrationRequired: true,
    beneficialOwnershipThreshold: 20,
    pepScreeningRequired: true,
    adverseMediaRequired: false,
    enhancedDueDiligenceThreshold: 20000,
  },
  Middle_East: {
    minimumKycLevel: 'enhanced',
    additionalDocuments: ['articles_of_incorporation', 'board_resolution'],
    localIdRequired: false,
    businessRegistrationRequired: true,
    beneficialOwnershipThreshold: 25,
    pepScreeningRequired: true,
    adverseMediaRequired: true,
    enhancedDueDiligenceThreshold: 10000,
  },
  North_America: {
    minimumKycLevel: 'enhanced',
    additionalDocuments: ['articles_of_incorporation', 'beneficial_ownership', 'tax_identification'],
    localIdRequired: true,
    businessRegistrationRequired: true,
    beneficialOwnershipThreshold: 25,
    pepScreeningRequired: true,
    adverseMediaRequired: true,
    enhancedDueDiligenceThreshold: 10000,
  },
  APAC: {
    minimumKycLevel: 'standard',
    additionalDocuments: ['articles_of_incorporation'],
    localIdRequired: false,
    businessRegistrationRequired: true,
    beneficialOwnershipThreshold: 20,
    pepScreeningRequired: true,
    adverseMediaRequired: false,
    enhancedDueDiligenceThreshold: 20000,
  },
  Global: {
    minimumKycLevel: 'institutional',
    additionalDocuments: [
      'articles_of_incorporation',
      'beneficial_ownership',
      'tax_identification',
      'financial_statements',
    ],
    localIdRequired: false,
    businessRegistrationRequired: true,
    beneficialOwnershipThreshold: 10,
    pepScreeningRequired: true,
    adverseMediaRequired: true,
    enhancedDueDiligenceThreshold: 5000,
  },
};

// ============================================================================
// Default Jurisdiction Manager Implementation
// ============================================================================

export class DefaultJurisdictionManager implements JurisdictionManager {
  private readonly profiles = new Map<string, JurisdictionProfile>();
  private readonly profilesByAccount = new Map<string, Set<string>>();
  private readonly eventCallbacks: InstitutionalEventCallback[] = [];
  private counter = 0;

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.counter}`;
  }

  private emitEvent(event: InstitutionalEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  async createProfile(
    accountId: string,
    jurisdiction: Jurisdiction,
    frameworks: RegulatoryFramework[],
    options?: JurisdictionProfileOptions
  ): Promise<JurisdictionProfile> {
    const profileId = this.generateId('jur_profile');

    const defaultDataResidency: DataResidencyConfig = {
      primaryRegion: this.getDefaultRegion(jurisdiction),
      allowedRegions: this.getDefaultAllowedRegions(jurisdiction),
      prohibitedRegions: [],
      encryptionRequired: true,
      dataRetentionDays: 2555, // 7 years
      crossBorderTransferAllowed: false,
      adequacyDecisionCountries: [],
    };

    const defaultKycRequirements = DEFAULT_KYC_REQUIREMENTS[jurisdiction];

    const profile: JurisdictionProfile = {
      id: profileId,
      accountId,
      jurisdiction,
      frameworks,
      dataResidency: {
        ...defaultDataResidency,
        ...options?.dataResidency,
      },
      reportingRequirements: options?.reportingRequirements ?? [],
      restrictions: options?.restrictions ?? [],
      kycRequirements: {
        ...defaultKycRequirements,
        ...options?.kycRequirements,
      },
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.profiles.set(profileId, profile);

    if (!this.profilesByAccount.has(accountId)) {
      this.profilesByAccount.set(accountId, new Set());
    }
    this.profilesByAccount.get(accountId)!.add(profileId);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'compliance_review',
      accountId,
      actorId: 'system',
      actorRole: 'compliance_officer',
      action: 'create_jurisdiction_profile',
      resource: 'jurisdiction_profile',
      resourceId: profileId,
      details: { jurisdiction, frameworks },
      metadata: {},
    });

    return profile;
  }

  async getProfile(accountId: string, jurisdiction: Jurisdiction): Promise<JurisdictionProfile | null> {
    const profileIds = this.profilesByAccount.get(accountId) ?? new Set();
    for (const id of profileIds) {
      const profile = this.profiles.get(id);
      if (profile && profile.jurisdiction === jurisdiction) {
        return profile;
      }
    }
    return null;
  }

  async listProfiles(accountId: string): Promise<JurisdictionProfile[]> {
    const profileIds = this.profilesByAccount.get(accountId) ?? new Set();
    return Array.from(profileIds)
      .map(id => this.profiles.get(id))
      .filter((p): p is JurisdictionProfile => p !== undefined);
  }

  async updateProfile(
    profileId: string,
    updates: Partial<JurisdictionProfileUpdates>
  ): Promise<JurisdictionProfile> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Jurisdiction profile not found: ${profileId}`);
    }

    if (updates.frameworks !== undefined) {
      profile.frameworks = updates.frameworks;
    }
    if (updates.dataResidency !== undefined) {
      profile.dataResidency = { ...profile.dataResidency, ...updates.dataResidency };
    }
    if (updates.kycRequirements !== undefined) {
      profile.kycRequirements = { ...profile.kycRequirements, ...updates.kycRequirements };
    }
    if (updates.enabled !== undefined) {
      profile.enabled = updates.enabled;
    }

    profile.updatedAt = new Date();

    return profile;
  }

  async enableProfile(profileId: string): Promise<JurisdictionProfile> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Jurisdiction profile not found: ${profileId}`);
    }
    profile.enabled = true;
    profile.updatedAt = new Date();
    return profile;
  }

  async disableProfile(profileId: string): Promise<JurisdictionProfile> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Jurisdiction profile not found: ${profileId}`);
    }
    profile.enabled = false;
    profile.updatedAt = new Date();
    return profile;
  }

  async updateDataResidency(
    profileId: string,
    config: Partial<DataResidencyConfig>
  ): Promise<JurisdictionProfile> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Jurisdiction profile not found: ${profileId}`);
    }

    profile.dataResidency = { ...profile.dataResidency, ...config };
    profile.updatedAt = new Date();

    return profile;
  }

  async isDataResidencyCompliant(
    profileId: string,
    dataRegion: string
  ): Promise<DataResidencyCheckResult> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Jurisdiction profile not found: ${profileId}`);
    }

    const { dataResidency } = profile;

    // Check if region is prohibited
    if (dataResidency.prohibitedRegions.includes(dataRegion)) {
      return {
        compliant: false,
        region: dataRegion,
        allowedRegions: dataResidency.allowedRegions,
        prohibitedRegions: dataResidency.prohibitedRegions,
        reason: `Region ${dataRegion} is prohibited for this jurisdiction`,
      };
    }

    // Check if region is explicitly allowed
    if (
      dataResidency.allowedRegions.length === 0 ||
      dataResidency.allowedRegions.includes(dataRegion) ||
      dataRegion === dataResidency.primaryRegion
    ) {
      return {
        compliant: true,
        region: dataRegion,
        allowedRegions: dataResidency.allowedRegions,
        prohibitedRegions: dataResidency.prohibitedRegions,
      };
    }

    return {
      compliant: false,
      region: dataRegion,
      allowedRegions: dataResidency.allowedRegions,
      prohibitedRegions: dataResidency.prohibitedRegions,
      reason: `Region ${dataRegion} is not in the allowed regions list`,
    };
  }

  async addReportingRequirement(
    profileId: string,
    requirement: RegulatoryReportingRequirement
  ): Promise<JurisdictionProfile> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Jurisdiction profile not found: ${profileId}`);
    }

    // Check for duplicate
    const existing = profile.reportingRequirements.findIndex(
      r => r.framework === requirement.framework && r.reportType === requirement.reportType
    );

    if (existing >= 0) {
      profile.reportingRequirements[existing] = requirement;
    } else {
      profile.reportingRequirements.push(requirement);
    }

    profile.updatedAt = new Date();

    return profile;
  }

  async getReportingRequirements(
    profileId: string,
    framework?: RegulatoryFramework
  ): Promise<RegulatoryReportingRequirement[]> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Jurisdiction profile not found: ${profileId}`);
    }

    let requirements = profile.reportingRequirements;
    if (framework !== undefined) {
      requirements = requirements.filter(r => r.framework === framework);
    }

    return requirements;
  }

  async getDueReports(profileId: string): Promise<DueReport[]> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Jurisdiction profile not found: ${profileId}`);
    }

    const now = new Date();
    const dueReports: DueReport[] = [];

    for (const requirement of profile.reportingRequirements) {
      if (!requirement.enabled) continue;

      const dueDate = this.calculateNextDueDate(requirement.frequency);
      const overdue = dueDate < now;

      dueReports.push({
        profileId,
        framework: requirement.framework,
        reportType: requirement.reportType,
        dueDate,
        recipient: requirement.recipient,
        overdue,
      });
    }

    return dueReports;
  }

  async addRestriction(
    profileId: string,
    restriction: JurisdictionRestriction
  ): Promise<JurisdictionProfile> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Jurisdiction profile not found: ${profileId}`);
    }

    profile.restrictions.push(restriction);
    profile.updatedAt = new Date();

    return profile;
  }

  async checkAssetAllowed(
    profileId: string,
    asset: string
  ): Promise<AssetAllowanceResult> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Jurisdiction profile not found: ${profileId}`);
    }

    const assetRestrictions = profile.restrictions.filter(
      r => r.type === 'asset' &&
        (r.prohibitedItems.includes(asset) || r.prohibitedItems.includes('*'))
    );

    const requiresLicense = assetRestrictions.some(r => r.requiresLicense);
    const licenseTypes = assetRestrictions
      .filter(r => r.requiresLicense && r.licenseType)
      .map(r => r.licenseType!);

    if (assetRestrictions.some(r => !r.requiresLicense)) {
      return {
        allowed: false,
        restrictions: assetRestrictions,
        requiresLicense: false,
        licenseTypes: [],
        reason: `Asset ${asset} is prohibited in jurisdiction ${profile.jurisdiction}`,
      };
    }

    return {
      allowed: !requiresLicense,
      restrictions: assetRestrictions,
      requiresLicense,
      licenseTypes,
      reason: requiresLicense
        ? `Asset ${asset} requires license in jurisdiction ${profile.jurisdiction}`
        : undefined,
    };
  }

  async checkServiceAllowed(
    profileId: string,
    service: string
  ): Promise<ServiceAllowanceResult> {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Jurisdiction profile not found: ${profileId}`);
    }

    const serviceRestrictions = profile.restrictions.filter(
      r => r.type === 'service' &&
        (r.prohibitedItems.includes(service) || r.prohibitedItems.includes('*'))
    );

    const requiresLicense = serviceRestrictions.some(r => r.requiresLicense);
    const licenseTypes = serviceRestrictions
      .filter(r => r.requiresLicense && r.licenseType)
      .map(r => r.licenseType!);

    if (serviceRestrictions.some(r => !r.requiresLicense)) {
      return {
        allowed: false,
        restrictions: serviceRestrictions,
        requiresLicense: false,
        licenseTypes: [],
        reason: `Service ${service} is prohibited in jurisdiction ${profile.jurisdiction}`,
      };
    }

    return {
      allowed: !requiresLicense,
      restrictions: serviceRestrictions,
      requiresLicense,
      licenseTypes,
      reason: requiresLicense
        ? `Service ${service} requires license in jurisdiction ${profile.jurisdiction}`
        : undefined,
    };
  }

  async getKycRequirements(
    accountId: string,
    jurisdiction: Jurisdiction
  ): Promise<JurisdictionKycRequirements> {
    const profile = await this.getProfile(accountId, jurisdiction);
    if (profile) {
      return profile.kycRequirements;
    }
    return DEFAULT_KYC_REQUIREMENTS[jurisdiction];
  }

  async isKycCompliant(
    accountId: string,
    jurisdiction: Jurisdiction,
    currentKycLevel: KycLevel,
    documents: DocumentType[]
  ): Promise<KycComplianceCheckResult> {
    const requirements = await this.getKycRequirements(accountId, jurisdiction);

    const kycLevelOrder: KycLevel[] = ['basic', 'standard', 'enhanced', 'institutional'];
    const currentLevelIndex = kycLevelOrder.indexOf(currentKycLevel);
    const requiredLevelIndex = kycLevelOrder.indexOf(requirements.minimumKycLevel);

    const kycLevelMet = currentLevelIndex >= requiredLevelIndex;

    const missingDocuments = requirements.additionalDocuments.filter(
      doc => !documents.includes(doc)
    );

    const additionalRequirements: string[] = [];
    if (requirements.localIdRequired) {
      additionalRequirements.push('Local ID required');
    }
    if (requirements.businessRegistrationRequired) {
      additionalRequirements.push('Business registration required');
    }
    if (requirements.pepScreeningRequired) {
      additionalRequirements.push('PEP screening required');
    }
    if (requirements.adverseMediaRequired) {
      additionalRequirements.push('Adverse media screening required');
    }

    const compliant = kycLevelMet && missingDocuments.length === 0;

    return {
      compliant,
      requiredLevel: requirements.minimumKycLevel,
      currentLevel: currentKycLevel,
      missingDocuments,
      additionalRequirements,
      reason: !compliant
        ? `KYC requirements not met for ${jurisdiction}: missing ${missingDocuments.join(', ')}`
        : undefined,
    };
  }

  async getApplicableFrameworks(accountId: string): Promise<RegulatoryFramework[]> {
    const profiles = await this.listProfiles(accountId);
    const enabledProfiles = profiles.filter(p => p.enabled);

    const frameworkSet = new Set<RegulatoryFramework>();
    for (const profile of enabledProfiles) {
      for (const framework of profile.frameworks) {
        frameworkSet.add(framework);
      }
    }

    return Array.from(frameworkSet);
  }

  async getStrictestKycRequirements(accountId: string): Promise<JurisdictionKycRequirements> {
    const profiles = await this.listProfiles(accountId);
    const enabledProfiles = profiles.filter(p => p.enabled);

    if (enabledProfiles.length === 0) {
      return DEFAULT_KYC_REQUIREMENTS['Global'];
    }

    const kycLevelOrder: KycLevel[] = ['basic', 'standard', 'enhanced', 'institutional'];

    let strictest: JurisdictionKycRequirements = enabledProfiles[0].kycRequirements;

    for (const profile of enabledProfiles.slice(1)) {
      const req = profile.kycRequirements;

      // Use strictest KYC level
      if (
        kycLevelOrder.indexOf(req.minimumKycLevel) >
        kycLevelOrder.indexOf(strictest.minimumKycLevel)
      ) {
        strictest = { ...strictest, minimumKycLevel: req.minimumKycLevel };
      }

      // Merge required documents
      const allDocs = new Set([...strictest.additionalDocuments, ...req.additionalDocuments]);
      strictest = { ...strictest, additionalDocuments: Array.from(allDocs) };

      // Use stricter threshold (lower = stricter)
      if (req.beneficialOwnershipThreshold < strictest.beneficialOwnershipThreshold) {
        strictest = { ...strictest, beneficialOwnershipThreshold: req.beneficialOwnershipThreshold };
      }
      if (req.enhancedDueDiligenceThreshold < strictest.enhancedDueDiligenceThreshold) {
        strictest = { ...strictest, enhancedDueDiligenceThreshold: req.enhancedDueDiligenceThreshold };
      }

      // Boolean OR for optional checks
      strictest = {
        ...strictest,
        localIdRequired: strictest.localIdRequired || req.localIdRequired,
        businessRegistrationRequired: strictest.businessRegistrationRequired || req.businessRegistrationRequired,
        pepScreeningRequired: strictest.pepScreeningRequired || req.pepScreeningRequired,
        adverseMediaRequired: strictest.adverseMediaRequired || req.adverseMediaRequired,
      };
    }

    return strictest;
  }

  onEvent(callback: InstitutionalEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private getDefaultRegion(jurisdiction: Jurisdiction): string {
    const regionMap: Record<Jurisdiction, string> = {
      EU: 'eu-central-1',
      US: 'us-east-1',
      UK: 'eu-west-2',
      Asia: 'ap-southeast-1',
      Middle_East: 'me-south-1',
      North_America: 'us-east-1',
      APAC: 'ap-southeast-2',
      Global: 'us-east-1',
    };
    return regionMap[jurisdiction];
  }

  private getDefaultAllowedRegions(jurisdiction: Jurisdiction): string[] {
    const regionsMap: Record<Jurisdiction, string[]> = {
      EU: ['eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-north-1', 'eu-south-1'],
      US: ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2'],
      UK: ['eu-west-2'],
      Asia: ['ap-southeast-1', 'ap-northeast-1', 'ap-south-1', 'ap-east-1'],
      Middle_East: ['me-south-1', 'me-central-1'],
      North_America: ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'ca-central-1'],
      APAC: ['ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1'],
      Global: [],
    };
    return regionsMap[jurisdiction];
  }

  private calculateNextDueDate(frequency: ReportFrequency): Date {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      case 'quarterly':
        return new Date(now.getFullYear(), now.getMonth() + 3, 1);
      case 'on_demand':
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createJurisdictionManager(): DefaultJurisdictionManager {
  return new DefaultJurisdictionManager();
}

export { DEFAULT_KYC_REQUIREMENTS };
