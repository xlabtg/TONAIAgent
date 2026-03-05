/**
 * TONAIAgent - Global Regulatory Integration Framework (GRIF)
 *
 * A structured, proactive regulatory integration model enabling the protocol
 * to operate as regulation-compatible infrastructure across all major jurisdictions.
 *
 * > "Regulation-compatible by architecture, not by exception."
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │             GRIF — Global Regulatory Integration Framework              │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │  1. Jurisdiction-Aware Deployment  │ Region configs, fund classes, pools │
 * │  2. Regulatory Mapping Matrix      │ Per-jurisdiction rules & obligations │
 * │  3. Compliance Module Interface    │ KYC, AML, custodian, RWA reporting  │
 * │  4. Regulatory Transparency Portal │ Stability, capital, reserves, clearing│
 * │  5. Audit & Attestation Layer      │ 3rd-party audits, proof-of-reserve  │
 * │  6. Regulatory Dialogue Framework  │ Docs, engagement tracking           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * @example
 * ```typescript
 * import { createGRIFManager } from '@tonaiagent/core/grif';
 *
 * const grif = createGRIFManager({
 *   primaryJurisdiction: 'CH',
 *   operationalRegions: ['EU', 'APAC', 'MENA'],
 *   complianceLevel: 'institutional',
 * });
 *
 * // Enable jurisdiction deployments
 * grif.jurisdictionDeployment.enableJurisdiction('CH', 'EU');
 * grif.jurisdictionDeployment.enableJurisdiction('SG', 'APAC');
 *
 * // Register an institutional-only fund class
 * const fundClass = grif.jurisdictionDeployment.registerFundClass({
 *   name: 'Sovereign RWA Fund',
 *   type: 'sovereign',
 *   eligibleJurisdictions: ['CH', 'SG', 'AE'],
 *   minimumInvestment: 10_000_000,
 * });
 *
 * // Verify a participant via compliance modules
 * const verification = await grif.complianceModules.verifyParticipant({
 *   participantId: 'inst-001',
 *   participantType: 'institutional',
 *   jurisdiction: 'CH',
 * });
 *
 * // Check regulatory mapping for a jurisdiction
 * const mapping = grif.regulatoryMapping.getMapping('SG');
 * console.log('SG custody requirements:', mapping.custodyRequirements);
 *
 * // Issue a proof-of-reserve attestation
 * const attestation = grif.auditAttestation.issueProofOfReserve({
 *   issuer: 'TONAIAgent',
 *   reserveAmount: 100_000_000,
 *   currency: 'USD',
 *   chain: 'ton',
 * });
 *
 * // Get transparency dashboard
 * const dashboard = grif.transparencyPortal.getDashboard();
 * console.log('System status:', dashboard.status);
 *
 * // Get full GRIF status
 * const status = grif.getStatus();
 * console.log('GRIF regulatory status:', status);
 * ```
 */

// Re-export all types
export * from './types';

// Re-export Jurisdiction-Aware Deployment Layer
export {
  JurisdictionDeploymentLayer,
  createJurisdictionDeploymentLayer,
  type JurisdictionDeploymentConfig,
  type RegisterFundClassParams,
  type CreatePermissionedPoolParams,
  type DeploymentFilters,
  type FundClassFilters,
  type PoolFilters,
} from './jurisdiction-deployment';

// Re-export Regulatory Mapping Matrix
export {
  RegulatoryMappingMatrix,
  createRegulatoryMappingMatrix,
  type RegulatoryMappingConfig,
} from './regulatory-mapping';

// Re-export Compliance Module Interface
export {
  ComplianceModuleInterface,
  createComplianceModuleInterface,
  type ComplianceModuleInterfaceConfig,
  type RegisterModuleParams,
  type VerifyParticipantParams,
  type ValidateAssetParams,
  type EnforceRestrictionsParams,
  type GenerateReportParams,
  type ModuleFilters,
} from './compliance-module-interface';

// Re-export Regulatory Transparency Portal
export {
  TransparencyPortal,
  createTransparencyPortal,
  type TransparencyPortalConfig,
  type PortalMetricFilters,
} from './transparency-portal';

// Re-export Audit & Attestation Layer
export {
  AuditAttestationLayer,
  createAuditAttestationLayer,
  type AuditAttestationConfig,
  type ScheduleAuditParams,
  type CompleteAuditParams,
  type IssueProofOfReserveParams,
  type IssueRiskAttestationParams,
  type IssueComplianceAttestationParams,
  type AuditFilters,
  type AttestationFilters,
} from './audit-attestation';

// Re-export Regulatory Dialogue Framework
export {
  RegulatoryDialogueFramework,
  createRegulatoryDialogueFramework,
  type RegulatoryDialogueConfig,
  type CreateDocumentParams,
  type UpdateDocumentParams,
  type RecordEngagementParams,
  type UpdateEngagementParams,
  type DocumentFilters,
  type EngagementFilters,
} from './regulatory-dialogue';

// ============================================================================
// Imports for GRIF Manager
// ============================================================================

import {
  JurisdictionDeploymentLayer,
  createJurisdictionDeploymentLayer,
  JurisdictionDeploymentConfig,
} from './jurisdiction-deployment';

import {
  RegulatoryMappingMatrix,
  createRegulatoryMappingMatrix,
  RegulatoryMappingConfig,
} from './regulatory-mapping';

import {
  ComplianceModuleInterface,
  createComplianceModuleInterface,
  ComplianceModuleInterfaceConfig,
} from './compliance-module-interface';

import {
  TransparencyPortal,
  createTransparencyPortal,
  TransparencyPortalConfig,
} from './transparency-portal';

import {
  AuditAttestationLayer,
  createAuditAttestationLayer,
  AuditAttestationConfig,
} from './audit-attestation';

import {
  RegulatoryDialogueFramework,
  createRegulatoryDialogueFramework,
  RegulatoryDialogueConfig,
} from './regulatory-dialogue';

import {
  GRIFConfig,
  GRIFStatusReport,
  GRIFJurisdictionCode,
  GRIFRiskLevel,
  RegulatoryStatus,
  GRIFEvent,
  GRIFEventCallback,
} from './types';

// ============================================================================
// GRIF Manager — Unified Interface
// ============================================================================

export interface GRIFManagerConfig extends GRIFConfig {
  jurisdictionDeployment?: JurisdictionDeploymentConfig;
  regulatoryMapping?: RegulatoryMappingConfig;
  complianceModules?: ComplianceModuleInterfaceConfig;
  transparencyPortal?: TransparencyPortalConfig;
  auditAttestation?: AuditAttestationConfig;
  dialogueFramework?: RegulatoryDialogueConfig;
}

/**
 * GRIFManager — Unified entry point for all six GRIF components.
 *
 * Exposes all components with a clean high-level API and event aggregation.
 */
export class GRIFManager {
  private readonly _config: GRIFManagerConfig;
  private eventListeners: GRIFEventCallback[] = [];

  /** 1. Jurisdiction-Aware Deployment Layer */
  public readonly jurisdictionDeployment: JurisdictionDeploymentLayer;

  /** 2. Regulatory Mapping Matrix */
  public readonly regulatoryMapping: RegulatoryMappingMatrix;

  /** 3. Compliance Module Interface */
  public readonly complianceModules: ComplianceModuleInterface;

  /** 4. Regulatory Transparency Portal */
  public readonly transparencyPortal: TransparencyPortal;

  /** 5. Audit & Attestation Layer */
  public readonly auditAttestation: AuditAttestationLayer;

  /** 6. Regulatory Dialogue Framework */
  public readonly dialogueFramework: RegulatoryDialogueFramework;

  get config(): GRIFManagerConfig {
    return this._config;
  }

  constructor(config: GRIFManagerConfig = {}) {
    this._config = {
      enabled: true,
      primaryJurisdiction: 'CH',
      operationalRegions: ['EU', 'APAC'],
      complianceLevel: 'standard',
      ...config,
    };

    // Initialize all six components
    this.jurisdictionDeployment = createJurisdictionDeploymentLayer(
      config.jurisdictionDeployment
    );
    this.regulatoryMapping = createRegulatoryMappingMatrix(config.regulatoryMapping);
    this.complianceModules = createComplianceModuleInterface(config.complianceModules);
    this.transparencyPortal = createTransparencyPortal(
      config.transparencyPortal ?? config.transparencyPortal
    );
    this.auditAttestation = createAuditAttestationLayer(config.auditAttestation);
    this.dialogueFramework = createRegulatoryDialogueFramework(config.dialogueFramework);

    // Wire event forwarding
    this.setupEventForwarding();
  }

  // ============================================================================
  // High-Level Operations
  // ============================================================================

  /**
   * Get the current GRIF regulatory status.
   */
  getStatus(): GRIFStatusReport {
    const enabledJurisdictions = this.jurisdictionDeployment
      .listDeploymentConfigs({ enabled: true })
      .map((c) => c.jurisdiction);

    const activeModules = this.complianceModules.listModules({ status: 'active' }).length;
    const pendingAttestations = this.auditAttestation
      .listAttestations({ expiredAfter: new Date() })
      .length;

    const openEngagements = this.dialogueFramework
      .listEngagements({ status: 'active' })
      .length + this.dialogueFramework.listEngagements({ status: 'pending' }).length;

    const dashboardStatus = this.transparencyPortal.getDashboard().status;
    const riskLevel = this.mapDashboardStatusToRisk(dashboardStatus);
    const overall = this.computeOverallStatus(riskLevel);

    return {
      overall,
      score: this.computeComplianceScore(riskLevel, activeModules, enabledJurisdictions.length),
      lastAssessed: new Date(),
      nextReviewDue: this.computeNextReview(riskLevel),
      activeModules,
      enabledJurisdictions,
      pendingAttestations,
      openEngagements,
      riskLevel,
    };
  }

  /**
   * Activate a jurisdiction for deployment (convenience method).
   */
  activateJurisdiction(jurisdiction: GRIFJurisdictionCode): void {
    const mapping = this.regulatoryMapping.getMapping(jurisdiction);
    this.jurisdictionDeployment.enableJurisdiction(jurisdiction, mapping.region);
  }

  /**
   * Get a combined compliance summary for a jurisdiction.
   */
  getJurisdictionSummary(jurisdiction: GRIFJurisdictionCode): {
    deploymentConfig: ReturnType<JurisdictionDeploymentLayer['getDeploymentConfig']>;
    regulatoryMapping: ReturnType<RegulatoryMappingMatrix['getMapping']>;
    activeModules: ReturnType<ComplianceModuleInterface['listModules']>;
  } {
    return {
      deploymentConfig: this.jurisdictionDeployment.getDeploymentConfig(jurisdiction),
      regulatoryMapping: this.regulatoryMapping.getMapping(jurisdiction),
      activeModules: this.complianceModules.listModules({
        status: 'active',
        jurisdiction,
      }),
    };
  }

  // ============================================================================
  // Event System
  // ============================================================================

  onEvent(callback: GRIFEventCallback): void {
    this.eventListeners.push(callback);
  }

  private setupEventForwarding(): void {
    const forward = (event: GRIFEvent) => {
      this.eventListeners.forEach((cb) => cb(event));
    };
    this.jurisdictionDeployment.onEvent(forward);
    this.complianceModules.onEvent(forward);
    this.transparencyPortal.onEvent(forward);
    this.auditAttestation.onEvent(forward);
    this.dialogueFramework.onEvent(forward);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mapDashboardStatusToRisk(
    status: 'healthy' | 'warning' | 'critical'
  ): GRIFRiskLevel {
    switch (status) {
      case 'healthy': return 'low';
      case 'warning': return 'medium';
      case 'critical': return 'high';
    }
  }

  private computeOverallStatus(riskLevel: GRIFRiskLevel): RegulatoryStatus {
    switch (riskLevel) {
      case 'low': return 'compliant';
      case 'medium': return 'partial';
      case 'high': return 'under_review';
      case 'critical': return 'non_compliant';
    }
  }

  private computeComplianceScore(
    riskLevel: GRIFRiskLevel,
    activeModules: number,
    enabledJurisdictions: number
  ): number {
    const base: Record<GRIFRiskLevel, number> = { low: 90, medium: 70, high: 50, critical: 30 };
    const moduleBonus = Math.min(activeModules * 2, 8);
    const jurisdictionBonus = Math.min(enabledJurisdictions, 2);
    return Math.min(base[riskLevel] + moduleBonus + jurisdictionBonus, 100);
  }

  private computeNextReview(riskLevel: GRIFRiskLevel): Date {
    const d = new Date();
    const daysMap: Record<GRIFRiskLevel, number> = { low: 180, medium: 90, high: 30, critical: 7 };
    d.setDate(d.getDate() + daysMap[riskLevel]);
    return d;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGRIFManager(config?: GRIFManagerConfig): GRIFManager {
  return new GRIFManager(config);
}

// Default export
export default {
  createGRIFManager,
  createJurisdictionDeploymentLayer,
  createRegulatoryMappingMatrix,
  createComplianceModuleInterface,
  createTransparencyPortal,
  createAuditAttestationLayer,
  createRegulatoryDialogueFramework,
};
