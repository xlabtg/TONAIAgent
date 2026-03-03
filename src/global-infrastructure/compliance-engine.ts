/**
 * TONAIAgent - Compliance-Aware Regional Infrastructure Engine
 *
 * Enforces jurisdictional rules for data residency, regulatory frameworks,
 * and cross-border compliance. Each agent placement and data operation is
 * validated against the applicable compliance profiles for the target region.
 *
 * Issue #100: Global Infrastructure & Edge Deployment
 */

import type {
  ComplianceCheckRequest,
  ComplianceCheckResult,
  ComplianceFramework,
  RegionalComplianceProfile,
  RegionCode,
} from './types';

// ============================================================================
// Built-in Regional Compliance Profiles
// ============================================================================

export const REGIONAL_COMPLIANCE_PROFILES: RegionalComplianceProfile[] = [
  {
    region: 'us-east-1',
    zone: 'north_america',
    applicableFrameworks: ['fatf', 'ccpa'],
    dataResidencyRequired: false,
    allowedDataTypes: ['personal', 'financial', 'transactional'],
    restrictedDataTypes: [],
    encryptionRequired: true,
    auditLogRetentionDays: 365,
    reportingRequirements: ['sar', 'ctr'],
    lastUpdated: new Date('2025-01-01'),
  },
  {
    region: 'us-west-2',
    zone: 'north_america',
    applicableFrameworks: ['fatf', 'ccpa'],
    dataResidencyRequired: false,
    allowedDataTypes: ['personal', 'financial', 'transactional'],
    restrictedDataTypes: [],
    encryptionRequired: true,
    auditLogRetentionDays: 365,
    reportingRequirements: ['sar', 'ctr'],
    lastUpdated: new Date('2025-01-01'),
  },
  {
    region: 'eu-west-1',
    zone: 'europe',
    applicableFrameworks: ['gdpr', 'mica', 'fatf'],
    dataResidencyRequired: true,
    allowedDataTypes: ['personal', 'financial', 'transactional'],
    restrictedDataTypes: ['biometric', 'special_category'],
    encryptionRequired: true,
    auditLogRetentionDays: 730,
    reportingRequirements: ['gdpr_dpa', 'mica_casp', 'fatf_str'],
    lastUpdated: new Date('2025-01-01'),
  },
  {
    region: 'eu-central-1',
    zone: 'europe',
    applicableFrameworks: ['gdpr', 'mica', 'fatf'],
    dataResidencyRequired: true,
    allowedDataTypes: ['personal', 'financial', 'transactional'],
    restrictedDataTypes: ['biometric', 'special_category'],
    encryptionRequired: true,
    auditLogRetentionDays: 730,
    reportingRequirements: ['gdpr_dpa', 'mica_casp', 'fatf_str'],
    lastUpdated: new Date('2025-01-01'),
  },
  {
    region: 'ap-southeast-1',
    zone: 'asia_pacific',
    applicableFrameworks: ['fatf', 'pdpa'],
    dataResidencyRequired: true,
    allowedDataTypes: ['personal', 'financial', 'transactional'],
    restrictedDataTypes: ['special_category'],
    encryptionRequired: true,
    auditLogRetentionDays: 365,
    reportingRequirements: ['fatf_str', 'mas_notice'],
    lastUpdated: new Date('2025-01-01'),
  },
  {
    region: 'ap-northeast-1',
    zone: 'asia_pacific',
    applicableFrameworks: ['fatf', 'pipeda'],
    dataResidencyRequired: false,
    allowedDataTypes: ['personal', 'financial', 'transactional'],
    restrictedDataTypes: [],
    encryptionRequired: true,
    auditLogRetentionDays: 365,
    reportingRequirements: ['fatf_str'],
    lastUpdated: new Date('2025-01-01'),
  },
  {
    region: 'me-south-1',
    zone: 'middle_east',
    applicableFrameworks: ['fatf'],
    dataResidencyRequired: false,
    allowedDataTypes: ['personal', 'financial', 'transactional'],
    restrictedDataTypes: [],
    encryptionRequired: true,
    auditLogRetentionDays: 365,
    reportingRequirements: ['fatf_str'],
    lastUpdated: new Date('2025-01-01'),
  },
  {
    region: 'sa-east-1',
    zone: 'latin_america',
    applicableFrameworks: ['fatf', 'lgpd'],
    dataResidencyRequired: true,
    allowedDataTypes: ['personal', 'financial', 'transactional'],
    restrictedDataTypes: ['special_category'],
    encryptionRequired: true,
    auditLogRetentionDays: 365,
    reportingRequirements: ['lgpd_anpd', 'fatf_str'],
    lastUpdated: new Date('2025-01-01'),
  },
  {
    region: 'af-south-1',
    zone: 'africa',
    applicableFrameworks: ['fatf', 'popia'],
    dataResidencyRequired: true,
    allowedDataTypes: ['personal', 'financial', 'transactional'],
    restrictedDataTypes: ['special_category'],
    encryptionRequired: true,
    auditLogRetentionDays: 365,
    reportingRequirements: ['popia_ico', 'fatf_str'],
    lastUpdated: new Date('2025-01-01'),
  },
  {
    region: 'ap-south-1',
    zone: 'asia_pacific',
    applicableFrameworks: ['fatf'],
    dataResidencyRequired: false,
    allowedDataTypes: ['personal', 'financial', 'transactional'],
    restrictedDataTypes: [],
    encryptionRequired: true,
    auditLogRetentionDays: 365,
    reportingRequirements: ['fatf_str'],
    lastUpdated: new Date('2025-01-01'),
  },
];

// ============================================================================
// Compliance Engine
// ============================================================================

export class ComplianceEngine {
  private readonly profiles = new Map<RegionCode, RegionalComplianceProfile>();
  private readonly tenantRequirements = new Map<string, ComplianceFramework[]>();

  constructor() {
    // Load built-in profiles
    for (const profile of REGIONAL_COMPLIANCE_PROFILES) {
      this.profiles.set(profile.region, profile);
    }
  }

  /**
   * Register or update a regional compliance profile.
   */
  setProfile(profile: RegionalComplianceProfile): void {
    this.profiles.set(profile.region, profile);
  }

  /**
   * Set additional compliance requirements for a specific tenant.
   */
  setTenantComplianceRequirements(
    tenantId: string,
    frameworks: ComplianceFramework[]
  ): void {
    this.tenantRequirements.set(tenantId, frameworks);
  }

  /**
   * Check whether a data operation is compliant for the target region.
   */
  async checkCompliance(request: ComplianceCheckRequest): Promise<ComplianceCheckResult> {
    const profile = this.profiles.get(request.targetRegion);
    if (!profile) {
      // Unknown region — allow by default but flag it
      return {
        allowed: true,
        region: request.targetRegion,
        violatedFrameworks: [],
        requiredMitigations: ['Unknown region — monitor manually'],
        alternativeRegions: [],
        checkedAt: new Date(),
      };
    }

    const violations: ComplianceFramework[] = [];
    const mitigations: string[] = [];

    // Check data classification against restricted types
    const restrictedDataUsed = request.dataClassification.filter(
      (dc) => profile.restrictedDataTypes.includes(dc)
    );
    if (restrictedDataUsed.length > 0) {
      violations.push(...profile.applicableFrameworks);
      mitigations.push(
        `Data types [${restrictedDataUsed.join(', ')}] are restricted in ${request.targetRegion}`
      );
    }

    // Check tenant-specific requirements
    const tenantRequired = this.tenantRequirements.get(request.tenantId) ?? [];
    const missingFrameworks = tenantRequired.filter(
      (f) => !profile.applicableFrameworks.includes(f)
    );
    if (missingFrameworks.length > 0) {
      violations.push(...missingFrameworks);
      mitigations.push(
        `Tenant requires frameworks [${missingFrameworks.join(', ')}] not enforced in ${request.targetRegion}`
      );
    }

    // Check data residency for write/process operations
    if (
      profile.dataResidencyRequired &&
      (request.operationType === 'write' || request.operationType === 'process') &&
      request.userCountry
    ) {
      const countryInRegion = this.isCountryInRegion(
        request.userCountry,
        request.targetRegion
      );
      if (!countryInRegion) {
        violations.push('gdpr'); // Data residency is primarily a GDPR concern
        mitigations.push(
          `User country ${request.userCountry} data must reside in ${request.targetRegion} ` +
          `per data residency requirements`
        );
      }
    }

    const allowed = violations.length === 0;
    const alternativeRegions = allowed
      ? []
      : this.findAlternativeRegions(request, violations);

    return {
      allowed,
      region: request.targetRegion,
      violatedFrameworks: [...new Set(violations)],
      requiredMitigations: mitigations,
      alternativeRegions,
      checkedAt: new Date(),
    };
  }

  /**
   * Get the compliance profile for a region.
   */
  getProfile(region: RegionCode): RegionalComplianceProfile | undefined {
    return this.profiles.get(region);
  }

  /**
   * List all registered compliance profiles.
   */
  listProfiles(): RegionalComplianceProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Generate a compliance summary for a tenant.
   */
  getTenantComplianceSummary(tenantId: string): {
    tenantId: string;
    requiredFrameworks: ComplianceFramework[];
    compliantRegions: RegionCode[];
    nonCompliantRegions: RegionCode[];
  } {
    const required = this.tenantRequirements.get(tenantId) ?? [];
    const compliant: RegionCode[] = [];
    const nonCompliant: RegionCode[] = [];

    for (const [region, profile] of this.profiles) {
      const hasAll = required.every((f) => profile.applicableFrameworks.includes(f));
      if (hasAll) {
        compliant.push(region);
      } else {
        nonCompliant.push(region);
      }
    }

    return {
      tenantId,
      requiredFrameworks: required,
      compliantRegions: compliant,
      nonCompliantRegions: nonCompliant,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Approximate country-to-region mapping for data residency checks.
   * In production this would use a comprehensive geolocation database.
   */
  private isCountryInRegion(countryCode: string, region: RegionCode): boolean {
    const EU_COUNTRIES = new Set([
      'AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HR',
      'HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK',
    ]);
    const EU_REGIONS: RegionCode[] = ['eu-west-1', 'eu-central-1'];
    const US_REGIONS: RegionCode[] = ['us-east-1', 'us-west-2'];
    const APAC_REGIONS: RegionCode[] = ['ap-southeast-1', 'ap-northeast-1', 'ap-south-1'];
    const ME_REGIONS: RegionCode[] = ['me-south-1'];
    const LATAM_REGIONS: RegionCode[] = ['sa-east-1'];
    const AFRICA_REGIONS: RegionCode[] = ['af-south-1'];

    if (EU_COUNTRIES.has(countryCode)) return EU_REGIONS.includes(region);
    if (['US', 'CA'].includes(countryCode)) return US_REGIONS.includes(region);
    if (['SG', 'JP', 'IN', 'AU', 'NZ', 'TH', 'MY', 'ID', 'PH'].includes(countryCode)) {
      return APAC_REGIONS.includes(region);
    }
    if (['SA', 'AE', 'BH', 'KW', 'OM', 'QA'].includes(countryCode)) {
      return ME_REGIONS.includes(region);
    }
    if (['BR', 'MX', 'AR', 'CL', 'CO'].includes(countryCode)) {
      return LATAM_REGIONS.includes(region);
    }
    if (['ZA', 'NG', 'KE', 'EG', 'GH'].includes(countryCode)) {
      return AFRICA_REGIONS.includes(region);
    }

    // Default: allow any region for unlisted countries
    return true;
  }

  private findAlternativeRegions(
    request: ComplianceCheckRequest,
    violations: ComplianceFramework[]
  ): RegionCode[] {
    const alternatives: RegionCode[] = [];
    for (const [region, profile] of this.profiles) {
      if (region === request.targetRegion) continue;
      // Check if this region satisfies the violated frameworks
      const satisfiesAll = violations.every((v) =>
        profile.applicableFrameworks.includes(v)
      );
      if (satisfiesAll) {
        alternatives.push(region);
      }
    }
    return alternatives.slice(0, 3); // Return up to 3 alternatives
  }
}

export function createComplianceEngine(): ComplianceEngine {
  return new ComplianceEngine();
}
