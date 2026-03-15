/**
 * TONAIAgent - SGIA Sovereign Integration Framework
 *
 * Manages tokenized institutional vaults, permissioned fund classes, and
 * multi-signature vault configurations for sovereign wealth funds, central banks,
 * and Tier-1 institutional participants.
 *
 * This is Domain 1 of the Sovereign-Grade Institutional Alignment (SGIA) framework.
 */

import {
  InstitutionalVault,
  PermissionedFundClass,
  VaultSignatory,
  VaultAsset,
  SovereignEntityId,
  VaultId,
  FundClass,
  VaultType,
  SovereignEntityType,
  JurisdictionCode,
  KycAmlTier,
  EligibilityCriteria,
  AccessControlPolicy,
  SovereignIntegrationConfig,
  SGIAEvent,
  SGIAEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_SOVEREIGN_INTEGRATION_CONFIG: SovereignIntegrationConfig = {
  enableTokenizedVaults: true,
  enablePermissionedFundClasses: true,
  minimumMultiSigSignatures: 2,
  requireVaultAuditTrail: true,
  maxVaultAllocationPercent: 30,
  enableCrossJurisdictionVaults: true,
};

// ============================================================================
// Interface
// ============================================================================

export interface SovereignIntegrationFramework {
  readonly config: SovereignIntegrationConfig;

  // Institutional Vaults
  createVault(params: CreateVaultParams): InstitutionalVault;
  getVault(id: VaultId): InstitutionalVault | undefined;
  listVaults(filters?: VaultFilters): InstitutionalVault[];
  updateVault(id: VaultId, updates: Partial<InstitutionalVault>): InstitutionalVault;
  addVaultAsset(vaultId: VaultId, asset: Omit<VaultAsset, 'verifiedAt'>): VaultAsset;
  addVaultSignatory(vaultId: VaultId, signatory: Omit<VaultSignatory, 'id' | 'addedAt'>): VaultSignatory;
  freezeVault(id: VaultId, reason: string): InstitutionalVault;
  archiveVault(id: VaultId): InstitutionalVault;

  // Permissioned Fund Classes
  createFundClass(params: CreateFundClassParams): PermissionedFundClass;
  getFundClass(id: string): PermissionedFundClass | undefined;
  listFundClasses(filters?: FundClassFilters): PermissionedFundClass[];
  updateFundClass(id: string, updates: Partial<PermissionedFundClass>): PermissionedFundClass;
  closeFundClass(id: string): PermissionedFundClass;
  checkEligibility(entityId: SovereignEntityId, fundClassId: string): EligibilityResult;

  // Events
  onEvent(callback: SGIAEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface CreateVaultParams {
  name: string;
  vaultType: VaultType;
  fundClass: FundClass;
  ownerEntityId: SovereignEntityId;
  custodians?: string[];
  jurisdictions: JurisdictionCode[];
  minimumSignatures?: number;
  accessControlPolicy?: Partial<AccessControlPolicy>;
}

export interface VaultFilters {
  ownerEntityId?: SovereignEntityId;
  vaultType?: VaultType;
  fundClass?: FundClass;
  status?: InstitutionalVault['status'];
  jurisdiction?: JurisdictionCode;
}

export interface CreateFundClassParams {
  name: string;
  fundClass: FundClass;
  description: string;
  minimumInvestmentUSD: number;
  maximumInvestmentUSD?: number;
  lockupPeriodDays: number;
  redemptionNoticeDays: number;
  allowedJurisdictions: JurisdictionCode[];
  excludedJurisdictions?: JurisdictionCode[];
  eligibilityCriteria: Partial<EligibilityCriteria>;
  regulatoryApprovals?: string[];
}

export interface FundClassFilters {
  fundClass?: FundClass;
  status?: PermissionedFundClass['status'];
  jurisdiction?: JurisdictionCode;
  requiredEntityType?: SovereignEntityType;
  requiredKycTier?: KycAmlTier;
}

export interface EligibilityResult {
  entityId: SovereignEntityId;
  fundClassId: string;
  isEligible: boolean;
  failedCriteria: string[];
  requiredActions: string[];
  assessedAt: Date;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultSovereignIntegrationFramework implements SovereignIntegrationFramework {
  readonly config: SovereignIntegrationConfig;

  private readonly vaults = new Map<VaultId, InstitutionalVault>();
  private readonly fundClasses = new Map<string, PermissionedFundClass>();
  private readonly eventCallbacks: SGIAEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<SovereignIntegrationConfig>) {
    this.config = { ...DEFAULT_SOVEREIGN_INTEGRATION_CONFIG, ...config };
  }

  // ============================================================================
  // Institutional Vaults
  // ============================================================================

  createVault(params: CreateVaultParams): InstitutionalVault {
    const defaultPolicy: AccessControlPolicy = {
      requireKyc: true,
      minimumKycTier: 'enhanced',
      allowedEntityTypes: ['sovereign_wealth_fund', 'central_bank', 'tier1_bank', 'institutional_custodian'],
      allowedJurisdictions: params.jurisdictions,
      requireRegulatoryApproval: true,
      allowDelegatedAccess: false,
      auditTrailRequired: this.config.requireVaultAuditTrail,
    };

    const vault: InstitutionalVault = {
      id: this.generateId('vault'),
      name: params.name,
      vaultType: params.vaultType,
      fundClass: params.fundClass,
      ownerEntityId: params.ownerEntityId,
      custodians: params.custodians ?? [],
      signatories: [],
      minimumSignatures: params.minimumSignatures ?? this.config.minimumMultiSigSignatures,
      totalValueUSD: 0,
      allocatedValueUSD: 0,
      availableValueUSD: 0,
      assets: [],
      jurisdictions: params.jurisdictions,
      permissionedAddresses: [],
      accessControlPolicy: { ...defaultPolicy, ...params.accessControlPolicy },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    this.vaults.set(vault.id, vault);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'vault_created',
      severity: 'info',
      source: 'SovereignIntegrationFramework',
      message: `Institutional vault created: ${params.name} (${params.vaultType})`,
      data: { vaultId: vault.id, fundClass: params.fundClass, ownerEntityId: params.ownerEntityId },
      timestamp: new Date(),
    });

    return vault;
  }

  getVault(id: VaultId): InstitutionalVault | undefined {
    return this.vaults.get(id);
  }

  listVaults(filters?: VaultFilters): InstitutionalVault[] {
    let results = Array.from(this.vaults.values());

    if (filters?.ownerEntityId) results = results.filter(v => v.ownerEntityId === filters.ownerEntityId);
    if (filters?.vaultType) results = results.filter(v => v.vaultType === filters.vaultType);
    if (filters?.fundClass) results = results.filter(v => v.fundClass === filters.fundClass);
    if (filters?.status) results = results.filter(v => v.status === filters.status);
    if (filters?.jurisdiction) {
      results = results.filter(v => v.jurisdictions.includes(filters.jurisdiction!));
    }

    return results;
  }

  updateVault(id: VaultId, updates: Partial<InstitutionalVault>): InstitutionalVault {
    const vault = this.vaults.get(id);
    if (!vault) throw new Error(`Vault not found: ${id}`);

    Object.assign(vault, updates, { id, updatedAt: new Date() });

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'vault_updated',
      severity: 'info',
      source: 'SovereignIntegrationFramework',
      message: `Vault updated: ${vault.name}`,
      data: { vaultId: id, updatedFields: Object.keys(updates) },
      timestamp: new Date(),
    });

    return vault;
  }

  addVaultAsset(vaultId: VaultId, asset: Omit<VaultAsset, 'verifiedAt'>): VaultAsset {
    const vault = this.vaults.get(vaultId);
    if (!vault) throw new Error(`Vault not found: ${vaultId}`);

    const newAsset: VaultAsset = {
      ...asset,
      verifiedAt: new Date(),
    };

    vault.assets.push(newAsset);
    vault.totalValueUSD += asset.usdValue;
    vault.availableValueUSD += asset.usdValue;
    vault.updatedAt = new Date();

    return newAsset;
  }

  addVaultSignatory(vaultId: VaultId, signatory: Omit<VaultSignatory, 'id' | 'addedAt'>): VaultSignatory {
    const vault = this.vaults.get(vaultId);
    if (!vault) throw new Error(`Vault not found: ${vaultId}`);

    const newSignatory: VaultSignatory = {
      ...signatory,
      id: this.generateId('sig'),
      addedAt: new Date(),
    };

    vault.signatories.push(newSignatory);
    vault.updatedAt = new Date();

    return newSignatory;
  }

  freezeVault(id: VaultId, reason: string): InstitutionalVault {
    const vault = this.vaults.get(id);
    if (!vault) throw new Error(`Vault not found: ${id}`);

    vault.status = 'frozen';
    vault.updatedAt = new Date();
    void reason;

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'vault_suspended',
      severity: 'warning',
      source: 'SovereignIntegrationFramework',
      message: `Vault frozen: ${vault.name}`,
      data: { vaultId: id, reason },
      timestamp: new Date(),
    });

    return vault;
  }

  archiveVault(id: VaultId): InstitutionalVault {
    const vault = this.vaults.get(id);
    if (!vault) throw new Error(`Vault not found: ${id}`);

    vault.status = 'archived';
    vault.updatedAt = new Date();
    return vault;
  }

  // ============================================================================
  // Permissioned Fund Classes
  // ============================================================================

  createFundClass(params: CreateFundClassParams): PermissionedFundClass {
    const eligibility: EligibilityCriteria = {
      requiredEntityTypes: params.eligibilityCriteria.requiredEntityTypes ?? ['sovereign_wealth_fund', 'central_bank'],
      requiredKycTier: params.eligibilityCriteria.requiredKycTier ?? 'sovereign_grade',
      requiresSovereignClassification: params.eligibilityCriteria.requiresSovereignClassification ?? false,
      additionalRequirements: params.eligibilityCriteria.additionalRequirements ?? [],
      minimumAUMUSD: params.eligibilityCriteria.minimumAUMUSD,
    };

    const fundClass: PermissionedFundClass = {
      id: this.generateId('fc'),
      name: params.name,
      fundClass: params.fundClass,
      description: params.description,
      eligibilityCriteria: eligibility,
      minimumInvestmentUSD: params.minimumInvestmentUSD,
      maximumInvestmentUSD: params.maximumInvestmentUSD,
      lockupPeriodDays: params.lockupPeriodDays,
      redemptionNoticeDays: params.redemptionNoticeDays,
      allowedJurisdictions: params.allowedJurisdictions,
      excludedJurisdictions: params.excludedJurisdictions ?? [],
      regulatoryApprovals: params.regulatoryApprovals ?? [],
      status: 'active',
      createdAt: new Date(),
    };

    this.fundClasses.set(fundClass.id, fundClass);
    return fundClass;
  }

  getFundClass(id: string): PermissionedFundClass | undefined {
    return this.fundClasses.get(id);
  }

  listFundClasses(filters?: FundClassFilters): PermissionedFundClass[] {
    let results = Array.from(this.fundClasses.values());

    if (filters?.fundClass) results = results.filter(fc => fc.fundClass === filters.fundClass);
    if (filters?.status) results = results.filter(fc => fc.status === filters.status);
    if (filters?.jurisdiction) {
      results = results.filter(fc =>
        fc.allowedJurisdictions.includes(filters.jurisdiction!) &&
        !fc.excludedJurisdictions.includes(filters.jurisdiction!)
      );
    }
    if (filters?.requiredEntityType) {
      results = results.filter(fc =>
        fc.eligibilityCriteria.requiredEntityTypes.includes(filters.requiredEntityType!)
      );
    }
    if (filters?.requiredKycTier) {
      results = results.filter(fc => fc.eligibilityCriteria.requiredKycTier === filters.requiredKycTier);
    }

    return results;
  }

  updateFundClass(id: string, updates: Partial<PermissionedFundClass>): PermissionedFundClass {
    const fundClass = this.fundClasses.get(id);
    if (!fundClass) throw new Error(`Fund class not found: ${id}`);

    Object.assign(fundClass, updates, { id });
    return fundClass;
  }

  closeFundClass(id: string): PermissionedFundClass {
    const fundClass = this.fundClasses.get(id);
    if (!fundClass) throw new Error(`Fund class not found: ${id}`);

    fundClass.status = 'closed';
    return fundClass;
  }

  checkEligibility(entityId: SovereignEntityId, fundClassId: string): EligibilityResult {
    const fundClass = this.fundClasses.get(fundClassId);
    const failedCriteria: string[] = [];
    const requiredActions: string[] = [];

    if (!fundClass) {
      return {
        entityId,
        fundClassId,
        isEligible: false,
        failedCriteria: [`Fund class not found: ${fundClassId}`],
        requiredActions: ['Verify fund class ID'],
        assessedAt: new Date(),
      };
    }

    if (fundClass.status !== 'active') {
      failedCriteria.push(`Fund class is not active: ${fundClass.status}`);
    }

    return {
      entityId,
      fundClassId,
      isEligible: failedCriteria.length === 0,
      failedCriteria,
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

export function createSovereignIntegrationFramework(
  config?: Partial<SovereignIntegrationConfig>
): DefaultSovereignIntegrationFramework {
  return new DefaultSovereignIntegrationFramework(config);
}

export default DefaultSovereignIntegrationFramework;
