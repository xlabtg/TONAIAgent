/**
 * TONAIAgent - Protocol Constitution & Governance Charter (Issue #126)
 *
 * The foundational constitutional layer of the protocol, defining governance
 * structure, AI authority bounds, risk hard limits, monetary governance rules,
 * emergency powers, and amendment processes.
 *
 * Architecture:
 *   Token Holders (DAO)
 *         ↓
 *   Governance Proposals → AI Advisory Analysis → Risk Oversight Review
 *         ↓
 *   Vote & Timelock → On-chain Execution
 *         ↓
 *   Constitutional Limits (Hard limits, AI prohibition list, Immutable clauses)
 *
 * Constitutional Sections:
 * 1. Foundational Principles   — Purpose, mission, values, decentralization
 * 2. Governance Architecture   — DAO, councils, AI advisory, voting thresholds
 * 3. AI Authority Spec         — Autonomous/bounded/advisory/prohibited actions
 * 4. Risk Boundaries           — Hard limits, soft limits, systemic exposure
 * 5. Monetary Governance Rules — Emission policy, inflation bounds, allocation
 * 6. Emergency Framework       — Trigger conditions, powers, auto-sunset
 * 7. Amendment Process         — Community review, audit, voting, timelock
 * 8. Institutional Compliance  — KYC, custody, RWA, jurisdiction mapping
 */

export * from './types';

export {
  DefaultFoundationalPrinciplesManager,
  createFoundationalPrinciplesManager,
  type FoundationalPrinciplesManager,
  DEFAULT_IMMUTABLE_CLAUSES as FOUNDATIONAL_IMMUTABLE_CLAUSES,
  DEFAULT_CORE_VALUES,
} from './foundational-principles';

export {
  DefaultGovernanceCharterManager,
  createGovernanceCharterManager,
  type GovernanceCharterManager,
  type DaoParameterSpec,
} from './governance-charter';

export {
  DefaultAiAuthorityManager,
  createAiAuthorityManager,
  type AiAuthorityManager,
  type AiOverrideRecord,
  type AiActionLog,
} from './ai-authority';

export {
  DefaultRiskBoundaryManager,
  createRiskBoundaryManager,
  type RiskBoundaryManager,
  type RiskValidationResult,
} from './risk-boundaries';

export {
  DefaultEmergencyFrameworkManager,
  createEmergencyFrameworkManager,
  type EmergencyFrameworkManager,
} from './emergency-framework';

export {
  DefaultAmendmentProcessManager,
  createAmendmentProcessManager,
  type AmendmentProcessManager,
  type ProposeAmendmentInput,
} from './amendment-process';

// ============================================================================
// Unified Protocol Constitution Layer Service
// ============================================================================

import { DefaultFoundationalPrinciplesManager, createFoundationalPrinciplesManager } from './foundational-principles';
import { DefaultGovernanceCharterManager, createGovernanceCharterManager, type DaoParameterSpec } from './governance-charter';
import { DefaultAiAuthorityManager, createAiAuthorityManager, type AiActionLog, type AiOverrideRecord } from './ai-authority';
import { DefaultRiskBoundaryManager, createRiskBoundaryManager, type RiskValidationResult } from './risk-boundaries';
import { DefaultEmergencyFrameworkManager, createEmergencyFrameworkManager } from './emergency-framework';
import { DefaultAmendmentProcessManager, createAmendmentProcessManager, type ProposeAmendmentInput } from './amendment-process';

import type {
  ProtocolConstitution,
  ProtocolConstitutionConfig,
  ProtocolConstitutionHealth,
  ConstitutionEvent,
  ConstitutionEventCallback,
  FoundationalPrinciples,
  GovernanceBody,
  GovernanceBodyType,
  AiAuthoritySpec,
  AiCapabilitySpec,
  AiAuthorityLevel,
  RiskBoundaryDefinitions,
  EmergencyActivation,
  EmergencyTriggerCondition,
  EmergencyPowerType,
  AmendmentProposal,
  AmendmentType,
  AmendmentStatus,
  ConstitutionalProposal,
  CreateConstitutionalProposalInput,
  DecentralizationTier,
} from './types';

export interface ProtocolConstitutionService {
  // Sub-systems
  readonly principles: DefaultFoundationalPrinciplesManager;
  readonly governance: DefaultGovernanceCharterManager;
  readonly aiAuthority: DefaultAiAuthorityManager;
  readonly riskBoundaries: DefaultRiskBoundaryManager;
  readonly emergency: DefaultEmergencyFrameworkManager;
  readonly amendments: DefaultAmendmentProcessManager;

  // High-level convenience methods

  // Constitution
  getConstitution(): ProtocolConstitution;

  // Governance
  createGovernanceProposal(input: CreateConstitutionalProposalInput): ConstitutionalProposal;
  getActiveProposals(): ConstitutionalProposal[];
  getDaoParameters(): DaoParameterSpec;
  getGovernanceBodies(): GovernanceBody[];

  // AI Authority
  checkAiAuthority(capabilityId: string): { canAct: boolean; requiresDAO: boolean; requiresHuman: boolean };
  recordAiAction(capabilityId: string, action: string, result: string): AiActionLog;
  applyAiOverride(capabilityId: string, reason: string, authorizedBy: string): AiOverrideRecord;

  // Risk Boundaries
  validateRiskParameter(parameterId: string, value: number): RiskValidationResult;
  checkSystemicExposure(exposurePercent: number): RiskValidationResult;
  checkInsuranceReserve(reservePercent: number): RiskValidationResult;

  // Emergency
  activateEmergency(
    triggerCondition: EmergencyTriggerCondition,
    triggerDetails: string,
    triggeredBy: string,
    powers: EmergencyPowerType[]
  ): EmergencyActivation;
  resolveEmergency(emergencyId: string, resolvedBy: string, notes: string): EmergencyActivation;
  getActiveEmergencies(): EmergencyActivation[];

  // Amendments
  proposeAmendment(input: ProposeAmendmentInput): AmendmentProposal;
  getPendingAmendments(): AmendmentProposal[];
  canAmendClause(clause: string): boolean;

  // Health
  getHealth(): ProtocolConstitutionHealth;

  // Events
  onEvent(callback: ConstitutionEventCallback): () => void;
}

const DEFAULT_CONSTITUTION_CONFIG: ProtocolConstitutionConfig = {
  constitutionVersion: '1.0.0',
  enableAiAdvisory: true,
  enableEmergencyProtocol: true,
  defaultAmendmentReviewDays: 14,
  defaultAmendmentAuditDays: 30,
  enableInstitutionalCompliance: true,
};

export const DEFAULT_PROTOCOL_CONSTITUTION_CONFIG = DEFAULT_CONSTITUTION_CONFIG;

export class DefaultProtocolConstitutionLayer implements ProtocolConstitutionService {
  readonly principles: DefaultFoundationalPrinciplesManager;
  readonly governance: DefaultGovernanceCharterManager;
  readonly aiAuthority: DefaultAiAuthorityManager;
  readonly riskBoundaries: DefaultRiskBoundaryManager;
  readonly emergency: DefaultEmergencyFrameworkManager;
  readonly amendments: DefaultAmendmentProcessManager;

  private readonly config: ProtocolConstitutionConfig;
  private readonly eventCallbacks: ConstitutionEventCallback[] = [];
  private readonly createdAt: Date;

  constructor(config: Partial<ProtocolConstitutionConfig> = {}) {
    this.config = { ...DEFAULT_CONSTITUTION_CONFIG, ...config };
    this.createdAt = new Date();

    this.principles = createFoundationalPrinciplesManager();
    this.governance = createGovernanceCharterManager();
    this.aiAuthority = createAiAuthorityManager();
    this.riskBoundaries = createRiskBoundaryManager();
    this.emergency = createEmergencyFrameworkManager();
    this.amendments = createAmendmentProcessManager();

    // Forward events from all sub-systems
    const forwardEvent = (event: ConstitutionEvent): void => {
      for (const cb of this.eventCallbacks) {
        try { cb(event); } catch { /* swallow */ }
      }
    };

    this.principles.onEvent(forwardEvent);
    this.governance.onEvent(forwardEvent);
    this.aiAuthority.onEvent(forwardEvent);
    this.riskBoundaries.onEvent(forwardEvent);
    this.emergency.onEvent(forwardEvent);
    this.amendments.onEvent(forwardEvent);
  }

  // --------------------------------------------------------------------------
  // Constitution
  // --------------------------------------------------------------------------

  getConstitution(): ProtocolConstitution {
    const principlesData = this.principles.getPrinciples();
    const governanceBodies = this.governance.getGovernanceBodies();
    const aiSpec = this.aiAuthority.getAuthoritySpec();
    const riskData = this.riskBoundaries.getRiskBoundaries();
    const emergencyData = this.emergency.getFramework();
    const amendmentRules = this.amendments.getProcessRules();

    const now = new Date();

    return {
      id: 'protocol-constitution-v1',
      version: this.config.constitutionVersion,
      name: 'TON AI Agent Protocol Constitution v1',
      preamble: 'This Constitution establishes the foundational governance framework for the TON AI Agent Protocol, defining the rights and responsibilities of token holders, the authority and limitations of AI systems, and the immutable protections that govern all protocol operations.',
      foundationalPrinciples: principlesData,
      governanceBodies,
      aiAuthoritySpec: aiSpec,
      riskBoundaries: riskData,
      monetaryRules: this.buildDefaultMonetaryRules(),
      emergencyFramework: emergencyData,
      amendmentRules,
      complianceSpec: this.buildDefaultComplianceSpec(),
      status: 'ratified',
      ratifiedAt: this.createdAt,
      ratifiedBy: [],
      currentAmendmentCount: this.amendments.getAmendmentsByStatus('enacted').length,
      createdAt: this.createdAt,
      updatedAt: now,
    };
  }

  // --------------------------------------------------------------------------
  // Governance
  // --------------------------------------------------------------------------

  createGovernanceProposal(input: CreateConstitutionalProposalInput): ConstitutionalProposal {
    return this.governance.createProposal(input);
  }

  getActiveProposals(): ConstitutionalProposal[] {
    return this.governance.getActiveProposals();
  }

  getDaoParameters(): DaoParameterSpec {
    return this.governance.getDaoParameters();
  }

  getGovernanceBodies(): GovernanceBody[] {
    return this.governance.getGovernanceBodies();
  }

  // --------------------------------------------------------------------------
  // AI Authority
  // --------------------------------------------------------------------------

  checkAiAuthority(capabilityId: string): { canAct: boolean; requiresDAO: boolean; requiresHuman: boolean } {
    return {
      canAct: this.aiAuthority.canActAutonomously(capabilityId),
      requiresDAO: this.aiAuthority.requiresDAOApproval(capabilityId),
      requiresHuman: this.aiAuthority.requiresHumanOverride(capabilityId),
    };
  }

  recordAiAction(capabilityId: string, action: string, result: string): AiActionLog {
    return this.aiAuthority.recordAiAction(capabilityId, action, result);
  }

  applyAiOverride(capabilityId: string, reason: string, authorizedBy: string): AiOverrideRecord {
    return this.aiAuthority.applyHumanOverride(capabilityId, reason, authorizedBy);
  }

  // --------------------------------------------------------------------------
  // Risk Boundaries
  // --------------------------------------------------------------------------

  validateRiskParameter(parameterId: string, value: number): RiskValidationResult {
    return this.riskBoundaries.validateParameter(parameterId, value);
  }

  checkSystemicExposure(exposurePercent: number): RiskValidationResult {
    return this.riskBoundaries.checkSystemicExposure(exposurePercent);
  }

  checkInsuranceReserve(reservePercent: number): RiskValidationResult {
    return this.riskBoundaries.checkInsuranceReserve(reservePercent);
  }

  // --------------------------------------------------------------------------
  // Emergency
  // --------------------------------------------------------------------------

  activateEmergency(
    triggerCondition: EmergencyTriggerCondition,
    triggerDetails: string,
    triggeredBy: string,
    powers: EmergencyPowerType[]
  ): EmergencyActivation {
    return this.emergency.activateEmergency(triggerCondition, triggerDetails, triggeredBy, powers);
  }

  resolveEmergency(emergencyId: string, resolvedBy: string, notes: string): EmergencyActivation {
    return this.emergency.resolveEmergency(emergencyId, resolvedBy, notes);
  }

  getActiveEmergencies(): EmergencyActivation[] {
    return this.emergency.getActiveEmergencies();
  }

  // --------------------------------------------------------------------------
  // Amendments
  // --------------------------------------------------------------------------

  proposeAmendment(input: ProposeAmendmentInput): AmendmentProposal {
    return this.amendments.proposeAmendment(input);
  }

  getPendingAmendments(): AmendmentProposal[] {
    return [
      ...this.amendments.getAmendmentsByStatus('draft'),
      ...this.amendments.getAmendmentsByStatus('community_review'),
      ...this.amendments.getAmendmentsByStatus('audit_pending'),
      ...this.amendments.getAmendmentsByStatus('audit_complete'),
      ...this.amendments.getAmendmentsByStatus('voting'),
      ...this.amendments.getAmendmentsByStatus('timelock'),
    ];
  }

  canAmendClause(clause: string): boolean {
    return this.amendments.canAmend(clause);
  }

  // --------------------------------------------------------------------------
  // Health
  // --------------------------------------------------------------------------

  getHealth(): ProtocolConstitutionHealth {
    const activeEmergencies = this.emergency.getActiveEmergencies();
    const pendingAmendments = this.getPendingAmendments();
    const activeProposals = this.governance.getActiveProposals();
    const principlesData = this.principles.getPrinciples();

    let overall: ProtocolConstitutionHealth['overall'] = 'healthy';
    if (activeEmergencies.length > 0) overall = 'degraded';
    if (activeEmergencies.length > 2) overall = 'critical';

    return {
      overall,
      constitutionStatus: 'ratified',
      activeEmergencies: activeEmergencies.length,
      pendingAmendments: pendingAmendments.length,
      pendingProposals: activeProposals.length,
      aiAdvisoryActive: this.config.enableAiAdvisory,
      complianceStatus: 'compliant',
      lastAuditDate: principlesData.adoptedAt,
    };
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  onEvent(callback: ConstitutionEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private buildDefaultMonetaryRules() {
    const now = new Date();
    return {
      id: 'monetary-rules-v1',
      version: '1.0.0',
      emissionPolicy: 'controlled_inflation' as const,
      maxInflationRatePercent: 5,
      maxDeflationRatePercent: 2,
      emergencyLiquidityInjectionCap: 10,
      treasuryAllocationApprovalThreshold: 20,
      aiMonetaryAdjustmentBounds: {
        maxPercentageChange: 5,
        maxFrequencyHours: 168,
        cooldownHours: 24,
      },
      stakeholderDistribution: [
        { stakeholder: 'token_holders', allocationPercent: 50, governanceRights: true },
        { stakeholder: 'treasury_council', allocationPercent: 20, governanceRights: true },
        { stakeholder: 'ecosystem_fund', allocationPercent: 20, governanceRights: false },
        { stakeholder: 'team_vested', allocationPercent: 10, vestingSchedule: '4_year_linear', governanceRights: false },
      ],
      adoptedAt: now,
      updatedAt: now,
    };
  }

  private buildDefaultComplianceSpec() {
    const now = new Date();
    return {
      id: 'compliance-spec-v1',
      version: '1.0.0',
      requirements: [
        {
          id: 'req-kyc-aml',
          type: 'kyc_aml' as const,
          description: 'KYC/AML verification for institutional participants',
          applicableJurisdictions: ['US', 'EU', 'UK'],
          mandatory: true,
          enforcementMechanism: 'whitelist_gating',
          reviewFrequencyDays: 365,
        },
        {
          id: 'req-custody',
          type: 'custody_standard' as const,
          description: 'Institutional-grade custody for assets above $1M',
          applicableJurisdictions: ['global'],
          mandatory: false,
          enforcementMechanism: 'optional_upgrade',
          reviewFrequencyDays: 180,
        },
      ],
      custodyStandard: 'MPC_multi_party_computation',
      kycProviders: ['jumio', 'onfido', 'sumsub'],
      supportedJurisdictions: ['US', 'EU', 'UK', 'SG', 'UAE', 'global'],
      rwaMappingFramework: 'ton_rwa_v1',
      adoptedAt: now,
      updatedAt: now,
    };
  }
}

export function createProtocolConstitutionLayer(
  config?: Partial<ProtocolConstitutionConfig>
): DefaultProtocolConstitutionLayer {
  return new DefaultProtocolConstitutionLayer(config);
}
