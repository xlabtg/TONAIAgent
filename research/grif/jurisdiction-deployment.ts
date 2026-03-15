/**
 * TONAIAgent - GRIF Jurisdiction-Aware Deployment Layer
 *
 * Enables configurable compliance modules, region-specific fund classes,
 * permissioned asset pools, and restricted participation rules per jurisdiction.
 *
 * This is Component 1 of the Global Regulatory Integration Framework (GRIF).
 */

import {
  GRIFJurisdictionCode,
  GRIFRegionCode,
  DeploymentRegionConfig,
  RegionComplianceRule,
  ComplianceRuleType,
  FundClass,
  FundClassType,
  PermissionedPool,
  ParticipantType,
  GRIFEvent,
  GRIFEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_DEPLOYMENT_CONFIG: JurisdictionDeploymentConfig = {
  enabled: true,
  defaultRegion: 'Global',
  enableAutoEnforcement: true,
  allowCrossRegionPools: false,
};

// ============================================================================
// Interface
// ============================================================================

export interface JurisdictionDeploymentConfig {
  enabled?: boolean;
  defaultRegion?: GRIFRegionCode;
  enableAutoEnforcement?: boolean;
  allowCrossRegionPools?: boolean;
}

export interface RegisterFundClassParams {
  name: string;
  type: FundClassType;
  eligibleJurisdictions: GRIFJurisdictionCode[];
  minimumInvestment?: number;
  currency?: string;
  assetRestrictions?: string[];
}

export interface CreatePermissionedPoolParams {
  name: string;
  fundClassId: string;
  jurisdiction: GRIFJurisdictionCode;
  allowedParticipantTypes: ParticipantType[];
  initialTvl?: number;
  currency?: string;
  complianceModuleIds?: string[];
}

export interface DeploymentFilters {
  jurisdiction?: GRIFJurisdictionCode;
  region?: GRIFRegionCode;
  enabled?: boolean;
}

export interface FundClassFilters {
  type?: FundClassType;
  jurisdiction?: GRIFJurisdictionCode;
  active?: boolean;
}

export interface PoolFilters {
  jurisdiction?: GRIFJurisdictionCode;
  fundClassId?: string;
  status?: PermissionedPool['status'];
}

// ============================================================================
// Jurisdiction-Aware Deployment Layer Implementation
// ============================================================================

export class JurisdictionDeploymentLayer {
  private readonly _config: JurisdictionDeploymentConfig;
  private regions: Map<string, DeploymentRegionConfig> = new Map();
  private fundClasses: Map<string, FundClass> = new Map();
  private pools: Map<string, PermissionedPool> = new Map();
  private eventListeners: GRIFEventCallback[] = [];

  get config(): JurisdictionDeploymentConfig {
    return this._config;
  }

  constructor(config: JurisdictionDeploymentConfig = {}) {
    this._config = { ...DEFAULT_DEPLOYMENT_CONFIG, ...config };
    this.initializeDefaultRegions();
  }

  // ============================================================================
  // Region Management
  // ============================================================================

  enableJurisdiction(
    jurisdiction: GRIFJurisdictionCode,
    region: GRIFRegionCode,
    rules?: Omit<RegionComplianceRule, 'id' | 'jurisdiction' | 'region' | 'effective' | 'lastUpdated'>[]
  ): DeploymentRegionConfig {
    const existing = this.regions.get(jurisdiction);

    const complianceRules: RegionComplianceRule[] = (rules ?? []).map((r, idx) => ({
      ...r,
      id: `rule-${jurisdiction}-${idx + 1}`,
      jurisdiction,
      region,
      effective: new Date(),
      lastUpdated: new Date(),
    }));

    const regionConfig: DeploymentRegionConfig = existing
      ? {
          ...existing,
          enabled: true,
          complianceRules: [...existing.complianceRules, ...complianceRules],
        }
      : {
          jurisdiction,
          region,
          enabled: true,
          complianceRules,
          fundClasses: [],
          pools: [],
          restrictedActivities: [],
          reportingFrequency: 'monthly',
        };

    this.regions.set(jurisdiction, regionConfig);

    this.emitEvent({
      type: 'module_status_changed',
      timestamp: new Date(),
      data: { action: 'jurisdiction_enabled', jurisdiction, region },
    });

    return regionConfig;
  }

  disableJurisdiction(jurisdiction: GRIFJurisdictionCode): void {
    const config = this.regions.get(jurisdiction);
    if (config) {
      this.regions.set(jurisdiction, { ...config, enabled: false });
    }
  }

  getDeploymentConfig(jurisdiction: GRIFJurisdictionCode): DeploymentRegionConfig | undefined {
    return this.regions.get(jurisdiction);
  }

  listDeploymentConfigs(filters?: DeploymentFilters): DeploymentRegionConfig[] {
    let configs = Array.from(this.regions.values());
    if (filters?.jurisdiction) {
      configs = configs.filter((c) => c.jurisdiction === filters.jurisdiction);
    }
    if (filters?.region) {
      configs = configs.filter((c) => c.region === filters.region);
    }
    if (filters?.enabled !== undefined) {
      configs = configs.filter((c) => c.enabled === filters.enabled);
    }
    return configs;
  }

  addComplianceRule(
    jurisdiction: GRIFJurisdictionCode,
    rule: Omit<RegionComplianceRule, 'id' | 'jurisdiction' | 'region' | 'effective' | 'lastUpdated'>
  ): RegionComplianceRule {
    const config = this.regions.get(jurisdiction);
    if (!config) {
      throw new Error(`Jurisdiction ${jurisdiction} not configured`);
    }

    const newRule: RegionComplianceRule = {
      ...rule,
      id: `rule-${jurisdiction}-${Date.now()}`,
      jurisdiction,
      region: config.region,
      effective: new Date(),
      lastUpdated: new Date(),
    };

    this.regions.set(jurisdiction, {
      ...config,
      complianceRules: [...config.complianceRules, newRule],
    });

    return newRule;
  }

  setRestrictedActivities(jurisdiction: GRIFJurisdictionCode, activities: string[]): void {
    const config = this.regions.get(jurisdiction);
    if (!config) {
      throw new Error(`Jurisdiction ${jurisdiction} not configured`);
    }
    this.regions.set(jurisdiction, { ...config, restrictedActivities: activities });
  }

  setReportingFrequency(
    jurisdiction: GRIFJurisdictionCode,
    frequency: DeploymentRegionConfig['reportingFrequency']
  ): void {
    const config = this.regions.get(jurisdiction);
    if (!config) {
      throw new Error(`Jurisdiction ${jurisdiction} not configured`);
    }
    this.regions.set(jurisdiction, { ...config, reportingFrequency: frequency });
  }

  // ============================================================================
  // Fund Classes
  // ============================================================================

  registerFundClass(params: RegisterFundClassParams): FundClass {
    const id = `fc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fundClass: FundClass = {
      id,
      name: params.name,
      type: params.type,
      eligibleJurisdictions: params.eligibleJurisdictions,
      participantRequirements: this.buildParticipantRequirements(params.type),
      assetRestrictions: params.assetRestrictions ?? [],
      minimumInvestment: params.minimumInvestment,
      currency: params.currency ?? 'USD',
      active: true,
      createdAt: new Date(),
    };
    this.fundClasses.set(id, fundClass);
    return fundClass;
  }

  getFundClass(id: string): FundClass | undefined {
    return this.fundClasses.get(id);
  }

  listFundClasses(filters?: FundClassFilters): FundClass[] {
    let classes = Array.from(this.fundClasses.values());
    if (filters?.type) {
      classes = classes.filter((fc) => fc.type === filters.type);
    }
    if (filters?.jurisdiction) {
      classes = classes.filter((fc) => fc.eligibleJurisdictions.includes(filters.jurisdiction!));
    }
    if (filters?.active !== undefined) {
      classes = classes.filter((fc) => fc.active === filters.active);
    }
    return classes;
  }

  deactivateFundClass(id: string): FundClass {
    const fc = this.fundClasses.get(id);
    if (!fc) throw new Error(`Fund class ${id} not found`);
    const updated = { ...fc, active: false };
    this.fundClasses.set(id, updated);
    return updated;
  }

  // ============================================================================
  // Permissioned Pools
  // ============================================================================

  createPermissionedPool(params: CreatePermissionedPoolParams): PermissionedPool {
    const fundClass = this.fundClasses.get(params.fundClassId);
    if (!fundClass) {
      throw new Error(`Fund class ${params.fundClassId} not found`);
    }
    if (!fundClass.eligibleJurisdictions.includes(params.jurisdiction)) {
      throw new Error(
        `Jurisdiction ${params.jurisdiction} not eligible for fund class ${fundClass.name}`
      );
    }

    const id = `pool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const pool: PermissionedPool = {
      id,
      name: params.name,
      fundClassId: params.fundClassId,
      jurisdiction: params.jurisdiction,
      allowedParticipantTypes: params.allowedParticipantTypes,
      tvl: params.initialTvl ?? 0,
      currency: params.currency ?? 'USD',
      status: 'open',
      complianceModuleIds: params.complianceModuleIds ?? [],
      createdAt: new Date(),
    };
    this.pools.set(id, pool);
    return pool;
  }

  getPool(id: string): PermissionedPool | undefined {
    return this.pools.get(id);
  }

  listPools(filters?: PoolFilters): PermissionedPool[] {
    let pools = Array.from(this.pools.values());
    if (filters?.jurisdiction) {
      pools = pools.filter((p) => p.jurisdiction === filters.jurisdiction);
    }
    if (filters?.fundClassId) {
      pools = pools.filter((p) => p.fundClassId === filters.fundClassId);
    }
    if (filters?.status) {
      pools = pools.filter((p) => p.status === filters.status);
    }
    return pools;
  }

  updatePoolStatus(id: string, status: PermissionedPool['status']): PermissionedPool {
    const pool = this.pools.get(id);
    if (!pool) throw new Error(`Pool ${id} not found`);
    const updated = { ...pool, status };
    this.pools.set(id, updated);
    return updated;
  }

  canParticipate(poolId: string, participantType: ParticipantType): boolean {
    const pool = this.pools.get(poolId);
    if (!pool || pool.status !== 'open') return false;
    return pool.allowedParticipantTypes.includes(participantType);
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

  private buildParticipantRequirements(type: FundClassType): FundClass['participantRequirements'] {
    switch (type) {
      case 'public':
        return [
          { type: 'retail', kycTier: 'basic', additionalChecks: ['identity_verification'] },
          { type: 'accredited_investor', kycTier: 'enhanced', additionalChecks: [] },
        ];
      case 'rwa_only':
        return [
          { type: 'accredited_investor', kycTier: 'enhanced', additionalChecks: ['accreditation_check'] },
          { type: 'institutional', kycTier: 'institutional', additionalChecks: ['legal_entity_verification'] },
        ];
      case 'accredited_investor':
        return [
          {
            type: 'accredited_investor',
            kycTier: 'enhanced',
            additionalChecks: ['accreditation_check', 'net_worth_verification'],
          },
        ];
      case 'institutional':
        return [
          {
            type: 'institutional',
            kycTier: 'institutional',
            additionalChecks: ['legal_entity_verification', 'aml_due_diligence'],
          },
        ];
      case 'sovereign':
        return [
          {
            type: 'sovereign',
            kycTier: 'institutional',
            additionalChecks: [
              'sovereign_verification',
              'sanctions_check',
              'political_exposure_screening',
            ],
          },
        ];
    }
  }

  private initializeDefaultRegions(): void {
    // Pre-configure major jurisdictions
    const defaults: Array<{ jurisdiction: GRIFJurisdictionCode; region: GRIFRegionCode }> = [
      { jurisdiction: 'CH', region: 'EU' },
      { jurisdiction: 'DE', region: 'EU' },
      { jurisdiction: 'GB', region: 'EU' },
      { jurisdiction: 'SG', region: 'APAC' },
      { jurisdiction: 'HK', region: 'APAC' },
      { jurisdiction: 'US', region: 'US' },
      { jurisdiction: 'AE', region: 'MENA' },
    ];

    for (const { jurisdiction, region } of defaults) {
      this.regions.set(jurisdiction, {
        jurisdiction,
        region,
        enabled: false,
        complianceRules: [],
        fundClasses: [],
        pools: [],
        restrictedActivities: [],
        reportingFrequency: 'monthly',
      });
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createJurisdictionDeploymentLayer(
  config?: JurisdictionDeploymentConfig
): JurisdictionDeploymentLayer {
  return new JurisdictionDeploymentLayer(config);
}
