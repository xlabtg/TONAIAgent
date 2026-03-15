/**
 * TONAIAgent - Sovereign-Grade Institutional Alignment (SGIA)
 *
 * A comprehensive framework enabling sovereign wealth funds, central banks,
 * national regulators, institutional custodians, and Tier-1 financial institutions
 * to interact with the protocol in a compliant, structured, and controlled manner.
 *
 * Six Alignment Domains:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │          SGIA - Sovereign-Grade Institutional Alignment Framework            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │  1. Sovereign Integration     │  Tokenized vaults, permissioned fund classes │
 * │  2. Regulatory Compatibility  │  KYC/AML plug-ins, jurisdiction-aware deploy │
 * │  3. Custody Alignment         │  Multi-sig vaults, custodian API compat.     │
 * │  4. Transparency & Audit      │  On-chain dashboards, real-time reporting    │
 * │  5. Capital Adequacy          │  Reserve requirements, liquidity buffers     │
 * │  6. Sovereign Participation   │  Observer / Allocator / Strategic Partner    │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * Institutional Coverage:
 * - Sovereign Wealth Funds (e.g., NBIM, GIC, ADIA)
 * - Central Banks (e.g., Fed, ECB, PBoC, BoE)
 * - National Regulators (e.g., SEC, FCA, BaFin)
 * - Tier-1 Banks (e.g., JPMorgan, Goldman Sachs, HSBC)
 * - Institutional Custodians (e.g., BNY Mellon, State Street, Clearstream)
 *
 * @example
 * ```typescript
 * import { createSGIAManager } from '@tonaiagent/core/sgia';
 *
 * // Initialize SGIA
 * const sgia = createSGIAManager();
 *
 * // Create a sovereign vault for a central bank
 * const vault = sgia.sovereignIntegration.createVault({
 *   name: 'ECB Digital Reserve Vault',
 *   vaultType: 'sovereign_vault',
 *   fundClass: 'sovereign_reserved',
 *   ownerEntityId: 'ecb-entity-001',
 *   jurisdictions: ['EU', 'DE'],
 *   minimumSignatures: 3,
 * });
 *
 * // Register KYC/AML module for a jurisdiction
 * const kycModule = sgia.regulatoryCompatibility.registerKycModule({
 *   name: 'EU Sovereign KYC Module',
 *   jurisdiction: 'EU',
 *   kycTier: 'sovereign_grade',
 *   supportedEntityTypes: ['central_bank', 'sovereign_wealth_fund'],
 * });
 *
 * // Register a sovereign participant as Strategic Partner
 * const participant = sgia.sovereignParticipation.registerParticipant({
 *   entityId: 'nbim-001',
 *   entityName: 'Norges Bank Investment Management',
 *   entityType: 'sovereign_wealth_fund',
 *   participationMode: 'strategic_partner',
 * });
 *
 * // Get system status
 * const status = sgia.getSystemStatus();
 * console.log('SGIA System Status:', status);
 * ```
 */

// Export all types
export * from './types';

// Export Sovereign Integration Framework
export {
  DefaultSovereignIntegrationFramework,
  createSovereignIntegrationFramework,
  type SovereignIntegrationFramework,
  type CreateVaultParams,
  type VaultFilters,
  type CreateFundClassParams,
  type FundClassFilters,
  type EligibilityResult,
} from './sovereign-integration';

// Export Regulatory Compatibility Layer
export {
  DefaultRegulatoryCompatibilityLayer,
  createRegulatoryCompatibilityLayer,
  type RegulatoryCompatibilityLayer,
  type RegisterKycModuleParams,
  type KycModuleFilters,
  type RegisterJurisdictionProfileParams,
  type JurisdictionProfileFilters,
  type KycVerificationParams,
  type KycVerificationRecord,
  type KycStepResult,
  type KycRecordFilters,
  type RegulatoryComplianceResult,
} from './regulatory-compatibility';

// Export Institutional Custody Alignment
export {
  DefaultInstitutionalCustodyAlignment,
  createInstitutionalCustodyAlignment,
  type InstitutionalCustodyAlignment,
  type RegisterCustodianParams,
  type CustodianFilters,
  type ConfigureMultiSigParams,
  type MultiSigFilters,
  type InitiateTransferParams,
  type TransferFilters,
  type ProofOfReserveResult,
} from './custody-alignment';

// Export Transparency & Audit Framework
export {
  DefaultTransparencyAuditFramework,
  createTransparencyAuditFramework,
  type TransparencyAuditFramework,
  type CreateAuditRecordParams,
  type AuditRecordFilters,
  type CreateDashboardParams,
  type DashboardFilters,
  type GenerateReportParams,
  type ReportFilters,
  type ComplianceScoreResult,
  type AuditSummary,
} from './transparency-audit';

// Export Capital Adequacy & Reserve Model
export {
  DefaultCapitalAdequacyAndReserveModel,
  createCapitalAdequacyAndReserveModel,
  type CapitalAdequacyAndReserveModel,
  type CreateCapitalModelParams,
  type CapitalModelFilters,
  type SetReserveRequirementParams,
  type ReserveRequirementFilters,
  type CreateLiquidityBufferParams,
  type LiquidityBufferFilters,
  type CapitalBreach,
} from './capital-adequacy';

// Export Sovereign Participation Manager
export {
  DefaultSovereignParticipationManager,
  createSovereignParticipationManager,
  type SovereignParticipationManager,
  type RegisterParticipantParams,
  type ParticipantFilters,
  type ParticipationSummary,
} from './sovereign-participation';

// ============================================================================
// Imports for Unified Manager
// ============================================================================

import { DefaultSovereignIntegrationFramework, createSovereignIntegrationFramework } from './sovereign-integration';
import { DefaultRegulatoryCompatibilityLayer, createRegulatoryCompatibilityLayer } from './regulatory-compatibility';
import { DefaultInstitutionalCustodyAlignment, createInstitutionalCustodyAlignment } from './custody-alignment';
import { DefaultTransparencyAuditFramework, createTransparencyAuditFramework } from './transparency-audit';
import { DefaultCapitalAdequacyAndReserveModel, createCapitalAdequacyAndReserveModel } from './capital-adequacy';
import { DefaultSovereignParticipationManager, createSovereignParticipationManager } from './sovereign-participation';
import {
  SGIAConfig,
  SGIASystemStatus,
  SGIAEvent,
  SGIAEventCallback,
} from './types';

// ============================================================================
// Unified SGIA Manager Interface
// ============================================================================

export interface SGIAManager {
  readonly sovereignIntegration: DefaultSovereignIntegrationFramework;
  readonly regulatoryCompatibility: DefaultRegulatoryCompatibilityLayer;
  readonly custodyAlignment: DefaultInstitutionalCustodyAlignment;
  readonly transparencyAudit: DefaultTransparencyAuditFramework;
  readonly capitalAdequacy: DefaultCapitalAdequacyAndReserveModel;
  readonly sovereignParticipation: DefaultSovereignParticipationManager;

  onEvent(callback: SGIAEventCallback): void;
  getSystemStatus(): SGIASystemStatus;
}

// ============================================================================
// Unified SGIA Manager Implementation
// ============================================================================

export class DefaultSGIAManager implements SGIAManager {
  readonly sovereignIntegration: DefaultSovereignIntegrationFramework;
  readonly regulatoryCompatibility: DefaultRegulatoryCompatibilityLayer;
  readonly custodyAlignment: DefaultInstitutionalCustodyAlignment;
  readonly transparencyAudit: DefaultTransparencyAuditFramework;
  readonly capitalAdequacy: DefaultCapitalAdequacyAndReserveModel;
  readonly sovereignParticipation: DefaultSovereignParticipationManager;

  private readonly eventCallbacks: SGIAEventCallback[] = [];

  constructor(config?: SGIAConfig) {
    this.sovereignIntegration = createSovereignIntegrationFramework(config?.sovereignIntegration);
    this.regulatoryCompatibility = createRegulatoryCompatibilityLayer(config?.regulatoryCompatibility);
    this.custodyAlignment = createInstitutionalCustodyAlignment(config?.custodyAlignment);
    this.transparencyAudit = createTransparencyAuditFramework(config?.transparencyAudit);
    this.capitalAdequacy = createCapitalAdequacyAndReserveModel(config?.capitalAdequacy);
    this.sovereignParticipation = createSovereignParticipationManager(config?.sovereignParticipation);

    this.setupEventForwarding();
  }

  onEvent(callback: SGIAEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  getSystemStatus(): SGIASystemStatus {
    // Sovereign Integration metrics
    const vaults = this.sovereignIntegration.listVaults({ status: 'active' });
    const fundClasses = this.sovereignIntegration.listFundClasses({ status: 'active' });
    const totalVaultValue = vaults.reduce((sum, v) => sum + v.totalValueUSD, 0);

    // Regulatory Compatibility metrics
    const kycModules = this.regulatoryCompatibility.listKycModules({ status: 'active' });
    const jurisdictionProfiles = this.regulatoryCompatibility.listJurisdictionProfiles({ complianceStatus: 'compliant' });
    const verifiedKycRecords = this.regulatoryCompatibility.listKycRecords({ status: 'completed' });
    const pendingKycRecords = this.regulatoryCompatibility.listKycRecords({ status: 'in_progress' });
    const verifiedEntityIds = new Set(verifiedKycRecords.map(r => r.entityId));

    // Custody Alignment metrics
    const custodians = this.custodyAlignment.listCustodians({ status: 'active' });
    const multiSigConfigs = this.custodyAlignment.listMultiSigConfigs();
    const pendingTransfers = this.custodyAlignment.listTransfers({ status: 'pending' });

    // Transparency & Audit metrics
    const auditRecords = this.transparencyAudit.listAuditRecords();
    const auditDashboards = this.transparencyAudit.listAuditDashboards();
    const flaggedRecords = this.transparencyAudit.listAuditRecords({ hasComplianceFlags: true });

    // Capital Adequacy metrics
    const capitalModels = this.capitalAdequacy.listCapitalModels();
    const capitalBreaches = this.capitalAdequacy.listCapitalModels({ status: 'breach' });
    const reserveBreaches = this.capitalAdequacy.listReserveRequirements({ isBreached: true });

    // Sovereign Participation metrics
    const participationSummary = this.sovereignParticipation.getParticipationSummary();

    return {
      // Sovereign Integration
      totalRegisteredEntities: verifiedEntityIds.size,
      activeVaults: vaults.length,
      totalVaultValueUSD: totalVaultValue,
      permissionedFundClasses: fundClasses.length,
      // Regulatory Compatibility
      activeKycModules: kycModules.length,
      verifiedEntities: verifiedEntityIds.size,
      activeJurisdictionProfiles: jurisdictionProfiles.length,
      pendingKycReviews: pendingKycRecords.length,
      // Custody Alignment
      activeCustodians: custodians.length,
      multiSigVaults: multiSigConfigs.length,
      pendingCustodianTransfers: pendingTransfers.length,
      // Transparency & Audit
      totalAuditRecords: auditRecords.length,
      activeAuditDashboards: auditDashboards.length,
      openAuditAlerts: flaggedRecords.length,
      // Capital Adequacy
      totalCapitalModels: capitalModels.length,
      capitalAdequacyBreaches: capitalBreaches.length,
      reserveRequirementBreaches: reserveBreaches.length,
      // Sovereign Participation
      activeParticipants: participationSummary.activeParticipants,
      observerCount: participationSummary.byMode.observer,
      allocatorCount: participationSummary.byMode.allocator,
      strategicPartnerCount: participationSummary.byMode.strategic_partner,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Private: Event Forwarding
  // ============================================================================

  private setupEventForwarding(): void {
    const forwardEvent = (event: SGIAEvent) => {
      for (const callback of this.eventCallbacks) {
        try {
          callback(event);
        } catch {
          // Ignore callback errors
        }
      }
    };

    this.sovereignIntegration.onEvent(forwardEvent);
    this.regulatoryCompatibility.onEvent(forwardEvent);
    this.custodyAlignment.onEvent(forwardEvent);
    this.transparencyAudit.onEvent(forwardEvent);
    this.capitalAdequacy.onEvent(forwardEvent);
    this.sovereignParticipation.onEvent(forwardEvent);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSGIAManager(config?: SGIAConfig): DefaultSGIAManager {
  return new DefaultSGIAManager(config);
}

// Default export
export default DefaultSGIAManager;
