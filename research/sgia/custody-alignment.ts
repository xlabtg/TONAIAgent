/**
 * TONAIAgent - SGIA Institutional Custody Alignment
 *
 * Manages multi-signature vault configurations, custodian API compatibility,
 * and institutional custody standards to ensure the highest level of asset
 * security and operational integrity for sovereign-grade participants.
 *
 * This is Domain 3 of the Sovereign-Grade Institutional Alignment (SGIA) framework.
 */

import {
  CustodianProfile,
  MultiSigVaultConfig,
  CustodianTransfer,
  VaultId,
  JurisdictionCode,
  CustodyAlignmentConfig,
  SGIAEvent,
  SGIAEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CUSTODY_ALIGNMENT_CONFIG: CustodyAlignmentConfig = {
  enableMultiSigVaults: true,
  enableCustodianApiIntegration: true,
  enableProofOfReserve: true,
  minimumInsuranceCoverageUSD: 100_000_000, // $100M minimum
  requireLicensedCustodians: true,
  enableCrossJurisdictionCustody: true,
  auditFrequency: 'daily',
};

// ============================================================================
// Interface
// ============================================================================

export interface InstitutionalCustodyAlignment {
  readonly config: CustodyAlignmentConfig;

  // Custodian Management
  registerCustodian(params: RegisterCustodianParams): CustodianProfile;
  getCustodian(id: string): CustodianProfile | undefined;
  listCustodians(filters?: CustodianFilters): CustodianProfile[];
  updateCustodian(id: string, updates: Partial<CustodianProfile>): CustodianProfile;
  suspendCustodian(id: string, reason: string): CustodianProfile;
  deregisterCustodian(id: string): CustodianProfile;

  // Multi-Sig Vault Configurations
  configureMultiSigVault(params: ConfigureMultiSigParams): MultiSigVaultConfig;
  getMultiSigConfig(vaultId: VaultId): MultiSigVaultConfig | undefined;
  listMultiSigConfigs(filters?: MultiSigFilters): MultiSigVaultConfig[];
  updateMultiSigConfig(vaultId: VaultId, updates: Partial<MultiSigVaultConfig>): MultiSigVaultConfig;

  // Custodian Transfers
  initiateCustodianTransfer(params: InitiateTransferParams): CustodianTransfer;
  getTransfer(id: string): CustodianTransfer | undefined;
  listTransfers(filters?: TransferFilters): CustodianTransfer[];
  approveTransfer(transferId: string, approverId: string): CustodianTransfer;
  executeTransfer(transferId: string): CustodianTransfer;
  cancelTransfer(transferId: string, reason: string): CustodianTransfer;

  // Proof of Reserve
  verifyProofOfReserve(custodianId: string): ProofOfReserveResult;

  // Events
  onEvent(callback: SGIAEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface RegisterCustodianParams {
  name: string;
  custodianType: CustodianProfile['custodianType'];
  jurisdiction: JurisdictionCode;
  regulatoryLicenses: string[];
  supportedAssets: string[];
  supportedChains: string[];
  segregationModel: CustodianProfile['segregationModel'];
  insuranceCoverageUSD: number;
  proofOfReserveEnabled?: boolean;
  auditFrequency?: CustodianProfile['auditFrequency'];
  apiProtocols?: string[];
  authMethods?: string[];
}

export interface CustodianFilters {
  custodianType?: CustodianProfile['custodianType'];
  jurisdiction?: JurisdictionCode;
  status?: CustodianProfile['status'];
  supportedAsset?: string;
  supportedChain?: string;
  minimumInsuranceUSD?: number;
}

export interface ConfigureMultiSigParams {
  vaultId: VaultId;
  signatoryThreshold: number;
  totalSignatories: number;
  timelock?: number;
  emergencyRecoveryEnabled?: boolean;
  hardwareSecurityModule?: boolean;
  geographicDistribution?: JurisdictionCode[];
}

export interface MultiSigFilters {
  vaultId?: VaultId;
  signatoryThreshold?: number;
  hardwareSecurityModule?: boolean;
}

export interface InitiateTransferParams {
  fromCustodianId: string;
  toCustodianId: string;
  vaultId: VaultId;
  assetId: string;
  amount: number;
  usdValue: number;
  initiatedBy: string;
  requiredApprovals?: number;
}

export interface TransferFilters {
  fromCustodianId?: string;
  toCustodianId?: string;
  vaultId?: VaultId;
  status?: CustodianTransfer['status'];
}

export interface ProofOfReserveResult {
  custodianId: string;
  custodianName: string;
  totalAssetsVerifiedUSD: number;
  totalLiabilitiesUSD: number;
  reserveRatio: number; // assets / liabilities
  passed: boolean;
  verificationMethod: string;
  verifiedAt: Date;
  nextVerificationAt: Date;
  discrepancies: string[];
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultInstitutionalCustodyAlignment implements InstitutionalCustodyAlignment {
  readonly config: CustodyAlignmentConfig;

  private readonly custodians = new Map<string, CustodianProfile>();
  private readonly multiSigConfigs = new Map<VaultId, MultiSigVaultConfig>();
  private readonly transfers = new Map<string, CustodianTransfer>();
  private readonly eventCallbacks: SGIAEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<CustodyAlignmentConfig>) {
    this.config = { ...DEFAULT_CUSTODY_ALIGNMENT_CONFIG, ...config };
  }

  // ============================================================================
  // Custodian Management
  // ============================================================================

  registerCustodian(params: RegisterCustodianParams): CustodianProfile {
    if (this.config.requireLicensedCustodians && params.regulatoryLicenses.length === 0) {
      throw new Error('At least one regulatory license is required for custodian registration');
    }

    if (params.insuranceCoverageUSD < this.config.minimumInsuranceCoverageUSD) {
      throw new Error(
        `Insurance coverage ($${params.insuranceCoverageUSD}) is below minimum ($${this.config.minimumInsuranceCoverageUSD})`
      );
    }

    const custodian: CustodianProfile = {
      id: this.generateId('cust'),
      name: params.name,
      custodianType: params.custodianType,
      jurisdiction: params.jurisdiction,
      regulatoryLicenses: params.regulatoryLicenses,
      supportedAssets: params.supportedAssets,
      supportedChains: params.supportedChains,
      segregationModel: params.segregationModel,
      insuranceCoverageUSD: params.insuranceCoverageUSD,
      apiCompatibility: {
        protocols: params.apiProtocols ?? ['REST', 'ISO20022'],
        authMethods: params.authMethods ?? ['mtls', 'api_key'],
        reportingFormats: ['JSON', 'XML'],
        settlementIntegrations: [],
      },
      proofOfReserveEnabled: params.proofOfReserveEnabled ?? this.config.enableProofOfReserve,
      auditFrequency: params.auditFrequency ?? this.config.auditFrequency,
      status: 'onboarding',
      onboardedAt: new Date(),
    };

    this.custodians.set(custodian.id, custodian);
    return custodian;
  }

  getCustodian(id: string): CustodianProfile | undefined {
    return this.custodians.get(id);
  }

  listCustodians(filters?: CustodianFilters): CustodianProfile[] {
    let results = Array.from(this.custodians.values());

    if (filters?.custodianType) results = results.filter(c => c.custodianType === filters.custodianType);
    if (filters?.jurisdiction) results = results.filter(c => c.jurisdiction === filters.jurisdiction);
    if (filters?.status) results = results.filter(c => c.status === filters.status);
    if (filters?.supportedAsset) {
      results = results.filter(c => c.supportedAssets.includes(filters.supportedAsset!));
    }
    if (filters?.supportedChain) {
      results = results.filter(c => c.supportedChains.includes(filters.supportedChain!));
    }
    if (filters?.minimumInsuranceUSD) {
      results = results.filter(c => c.insuranceCoverageUSD >= filters.minimumInsuranceUSD!);
    }

    return results;
  }

  updateCustodian(id: string, updates: Partial<CustodianProfile>): CustodianProfile {
    const custodian = this.custodians.get(id);
    if (!custodian) throw new Error(`Custodian not found: ${id}`);

    Object.assign(custodian, updates, { id });
    return custodian;
  }

  suspendCustodian(id: string, reason: string): CustodianProfile {
    const custodian = this.custodians.get(id);
    if (!custodian) throw new Error(`Custodian not found: ${id}`);

    custodian.status = 'suspended';
    void reason;
    return custodian;
  }

  deregisterCustodian(id: string): CustodianProfile {
    const custodian = this.custodians.get(id);
    if (!custodian) throw new Error(`Custodian not found: ${id}`);

    custodian.status = 'deregistered';
    return custodian;
  }

  // ============================================================================
  // Multi-Sig Vault Configurations
  // ============================================================================

  configureMultiSigVault(params: ConfigureMultiSigParams): MultiSigVaultConfig {
    if (params.signatoryThreshold > params.totalSignatories) {
      throw new Error('Threshold cannot exceed total signatories');
    }

    const config: MultiSigVaultConfig = {
      id: this.generateId('msig'),
      vaultId: params.vaultId,
      signatoryThreshold: params.signatoryThreshold,
      totalSignatories: params.totalSignatories,
      signatories: [],
      timelock: params.timelock,
      emergencyRecoveryEnabled: params.emergencyRecoveryEnabled ?? true,
      hardwareSecurityModule: params.hardwareSecurityModule ?? false,
      geographicDistribution: params.geographicDistribution ?? [],
      createdAt: new Date(),
    };

    this.multiSigConfigs.set(params.vaultId, config);
    return config;
  }

  getMultiSigConfig(vaultId: VaultId): MultiSigVaultConfig | undefined {
    return this.multiSigConfigs.get(vaultId);
  }

  listMultiSigConfigs(filters?: MultiSigFilters): MultiSigVaultConfig[] {
    let results = Array.from(this.multiSigConfigs.values());

    if (filters?.vaultId) results = results.filter(c => c.vaultId === filters.vaultId);
    if (filters?.signatoryThreshold) results = results.filter(c => c.signatoryThreshold === filters.signatoryThreshold);
    if (filters?.hardwareSecurityModule !== undefined) {
      results = results.filter(c => c.hardwareSecurityModule === filters.hardwareSecurityModule);
    }

    return results;
  }

  updateMultiSigConfig(vaultId: VaultId, updates: Partial<MultiSigVaultConfig>): MultiSigVaultConfig {
    const config = this.multiSigConfigs.get(vaultId);
    if (!config) throw new Error(`Multi-sig config not found for vault: ${vaultId}`);

    Object.assign(config, updates, { vaultId });
    return config;
  }

  // ============================================================================
  // Custodian Transfers
  // ============================================================================

  initiateCustodianTransfer(params: InitiateTransferParams): CustodianTransfer {
    const fromCustodian = this.custodians.get(params.fromCustodianId);
    if (!fromCustodian) throw new Error(`Source custodian not found: ${params.fromCustodianId}`);
    if (fromCustodian.status !== 'active') throw new Error(`Source custodian is not active: ${fromCustodian.status}`);

    const toCustodian = this.custodians.get(params.toCustodianId);
    if (!toCustodian) throw new Error(`Destination custodian not found: ${params.toCustodianId}`);
    if (toCustodian.status !== 'active') throw new Error(`Destination custodian is not active: ${toCustodian.status}`);

    const multiSigConfig = this.multiSigConfigs.get(params.vaultId);
    const requiredApprovals = params.requiredApprovals ?? multiSigConfig?.signatoryThreshold ?? 2;

    const transfer: CustodianTransfer = {
      id: this.generateId('txfr'),
      fromCustodianId: params.fromCustodianId,
      toCustodianId: params.toCustodianId,
      vaultId: params.vaultId,
      assetId: params.assetId,
      amount: params.amount,
      usdValue: params.usdValue,
      initiatedBy: params.initiatedBy,
      requiredApprovals,
      receivedApprovals: [],
      status: 'pending',
      initiatedAt: new Date(),
      metadata: {},
    };

    this.transfers.set(transfer.id, transfer);
    return transfer;
  }

  getTransfer(id: string): CustodianTransfer | undefined {
    return this.transfers.get(id);
  }

  listTransfers(filters?: TransferFilters): CustodianTransfer[] {
    let results = Array.from(this.transfers.values());

    if (filters?.fromCustodianId) results = results.filter(t => t.fromCustodianId === filters.fromCustodianId);
    if (filters?.toCustodianId) results = results.filter(t => t.toCustodianId === filters.toCustodianId);
    if (filters?.vaultId) results = results.filter(t => t.vaultId === filters.vaultId);
    if (filters?.status) results = results.filter(t => t.status === filters.status);

    return results;
  }

  approveTransfer(transferId: string, approverId: string): CustodianTransfer {
    const transfer = this.transfers.get(transferId);
    if (!transfer) throw new Error(`Transfer not found: ${transferId}`);
    if (transfer.status !== 'pending') throw new Error(`Transfer is not in pending status: ${transfer.status}`);

    if (!transfer.receivedApprovals.includes(approverId)) {
      transfer.receivedApprovals.push(approverId);
    }

    if (transfer.receivedApprovals.length >= transfer.requiredApprovals) {
      transfer.status = 'approved';
    }

    return transfer;
  }

  executeTransfer(transferId: string): CustodianTransfer {
    const transfer = this.transfers.get(transferId);
    if (!transfer) throw new Error(`Transfer not found: ${transferId}`);
    if (transfer.status !== 'approved') throw new Error(`Transfer has not been approved: ${transfer.status}`);

    transfer.status = 'executing';

    // Simulate execution completion
    transfer.status = 'completed';
    transfer.completedAt = new Date();

    return transfer;
  }

  cancelTransfer(transferId: string, reason: string): CustodianTransfer {
    const transfer = this.transfers.get(transferId);
    if (!transfer) throw new Error(`Transfer not found: ${transferId}`);
    if (transfer.status === 'completed') throw new Error('Cannot cancel a completed transfer');

    transfer.status = 'cancelled';
    void reason;
    return transfer;
  }

  // ============================================================================
  // Proof of Reserve
  // ============================================================================

  verifyProofOfReserve(custodianId: string): ProofOfReserveResult {
    const custodian = this.custodians.get(custodianId);
    if (!custodian) throw new Error(`Custodian not found: ${custodianId}`);

    // Simulate proof of reserve verification
    const totalAssetsUSD = custodian.insuranceCoverageUSD * 10; // Simulated
    const totalLiabilitiesUSD = custodian.insuranceCoverageUSD * 9; // Simulated
    const reserveRatio = totalAssetsUSD / totalLiabilitiesUSD;

    return {
      custodianId,
      custodianName: custodian.name,
      totalAssetsVerifiedUSD: totalAssetsUSD,
      totalLiabilitiesUSD,
      reserveRatio,
      passed: reserveRatio >= 1.0,
      verificationMethod: custodian.proofOfReserveEnabled ? 'on_chain_attestation' : 'third_party_audit',
      verifiedAt: new Date(),
      nextVerificationAt: new Date(Date.now() + 86400000), // Tomorrow
      discrepancies: [],
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

export function createInstitutionalCustodyAlignment(
  config?: Partial<CustodyAlignmentConfig>
): DefaultInstitutionalCustodyAlignment {
  return new DefaultInstitutionalCustodyAlignment(config);
}

export default DefaultInstitutionalCustodyAlignment;
