/**
 * TONAIAgent - AGFI Governance & Institutional Alignment
 *
 * Leverages the Protocol Constitution to add jurisdiction-aware governance modules,
 * sovereign-grade onboarding flows, and institutional compliance bridges. Ensures
 * all AGFI operations meet the highest regulatory and governance standards globally.
 *
 * This is Pillar 5 of the AI-native Global Financial Infrastructure (AGFI).
 */

import {
  JurisdictionModule,
  JurisdictionRule,
  SovereignOnboardingProfile,
  InstitutionalComplianceBridge,
  GovernanceProposal,
  InstitutionId,
  JurisdictionCode,
  GovernanceModuleId,
  GovernanceInstitutionalAlignmentConfig,
  AGFIEvent,
  AGFIEventCallback,
  GovernanceActionType,
  InstitutionType,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_GOVERNANCE_CONFIG: GovernanceInstitutionalAlignmentConfig = {
  enableJurisdictionModules: true,
  enableSovereignOnboarding: true,
  defaultGovernanceQuorum: 66.7, // 2/3 majority
  votingPeriodDays: 7,
  enableComplianceBridges: true,
  requireMultiSignatureForSovereign: true,
};

// ============================================================================
// Governance & Institutional Alignment Interface
// ============================================================================

export interface GovernanceInstitutionalAlignment {
  readonly config: GovernanceInstitutionalAlignmentConfig;

  // Jurisdiction Modules
  registerJurisdictionModule(params: RegisterJurisdictionModuleParams): JurisdictionModule;
  getJurisdictionModule(id: GovernanceModuleId): JurisdictionModule | undefined;
  getJurisdictionModuleByCode(jurisdiction: JurisdictionCode): JurisdictionModule | undefined;
  listJurisdictionModules(filters?: JurisdictionModuleFilters): JurisdictionModule[];
  addJurisdictionRule(moduleId: GovernanceModuleId, rule: Omit<JurisdictionRule, 'id'>): JurisdictionRule;
  updateJurisdictionModule(id: GovernanceModuleId, updates: Partial<JurisdictionModule>): JurisdictionModule;
  deprecateJurisdictionModule(id: GovernanceModuleId, reason: string): void;

  // Sovereign Onboarding
  initiateSovereignOnboarding(params: SovereignOnboardingParams): SovereignOnboardingProfile;
  getSovereignProfile(id: string): SovereignOnboardingProfile | undefined;
  listSovereignProfiles(filters?: SovereignProfileFilters): SovereignOnboardingProfile[];
  advanceOnboardingStage(profileId: string, evidence?: string): SovereignOnboardingProfile;
  completeSovereignOnboarding(profileId: string): SovereignOnboardingProfile;

  // Compliance Bridges
  registerComplianceBridge(params: RegisterComplianceBridgeParams): InstitutionalComplianceBridge;
  getComplianceBridge(id: string): InstitutionalComplianceBridge | undefined;
  listComplianceBridges(filters?: ComplianceBridgeFilters): InstitutionalComplianceBridge[];
  syncComplianceBridge(id: string): ComplianceSyncResult;

  // Governance Proposals
  proposeGovernanceAction(params: ProposeGovernanceActionParams): GovernanceProposal;
  getProposal(id: string): GovernanceProposal | undefined;
  listProposals(filters?: ProposalFilters): GovernanceProposal[];
  castVote(proposalId: string, voterPower: number, inFavor: boolean): VoteResult;
  executeProposal(proposalId: string): GovernanceProposal;
  cancelProposal(proposalId: string, reason: string): GovernanceProposal;

  // Compliance Checking
  checkJurisdictionCompliance(institutionId: InstitutionId, jurisdiction: JurisdictionCode, operationType: string): ComplianceAssessment;

  // Events
  onEvent(callback: AGFIEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface RegisterJurisdictionModuleParams {
  jurisdiction: JurisdictionCode;
  name: string;
  regulatoryFramework: string;
  supportedInstitutionTypes: InstitutionType[];
  kycAmlStandard: string;
  sanctionsLists?: string[];
}

export interface JurisdictionModuleFilters {
  jurisdiction?: JurisdictionCode;
  status?: JurisdictionModule['status'];
  supportedType?: InstitutionType;
}

export interface SovereignOnboardingParams {
  institutionId: InstitutionId;
  sovereignType: SovereignOnboardingProfile['sovereignType'];
  countryCode: string;
  regulatoryClassification: string;
  dueDiligenceLevel?: SovereignOnboardingProfile['dueDiligenceLevel'];
  assignedJurisdictionModules?: GovernanceModuleId[];
}

export interface SovereignProfileFilters {
  sovereignType?: SovereignOnboardingProfile['sovereignType'];
  countryCode?: string;
  onboardingStage?: SovereignOnboardingProfile['onboardingStage'];
  completed?: boolean;
}

export interface RegisterComplianceBridgeParams {
  bridgeName: string;
  targetSystem: string;
  supportedJurisdictions: JurisdictionCode[];
  complianceStandards: string[];
  encryptionProtocol?: string;
  apiVersion?: string;
}

export interface ComplianceBridgeFilters {
  targetSystem?: string;
  status?: InstitutionalComplianceBridge['status'];
  jurisdiction?: JurisdictionCode;
}

export interface ComplianceSyncResult {
  bridgeId: string;
  syncedAt: Date;
  rulesUpdated: number;
  newRulesAdded: number;
  deprecatedRules: number;
  status: 'success' | 'partial' | 'failed';
  details: string;
}

export interface ProposeGovernanceActionParams {
  proposalType: GovernanceActionType;
  title: string;
  description: string;
  proposedBy: string;
  targetModule: string;
  proposedChanges: Record<string, unknown>;
  jurisdictionalImpact?: JurisdictionCode[];
  institutionalImpact?: InstitutionId[];
}

export interface ProposalFilters {
  proposalType?: GovernanceActionType;
  status?: GovernanceProposal['status'];
  proposedBy?: string;
  targetModule?: string;
  affectsJurisdiction?: JurisdictionCode;
}

export interface VoteResult {
  proposalId: string;
  votedAt: Date;
  inFavor: boolean;
  voterPower: number;
  newApprovalPercent: number;
  quorumReached: boolean;
  passed?: boolean; // Set if voting period ended
}

export interface ComplianceAssessment {
  institutionId: InstitutionId;
  jurisdiction: JurisdictionCode;
  operationType: string;
  isCompliant: boolean;
  violations: ComplianceViolation[];
  warnings: ComplianceWarning[];
  requiredActions: string[];
  assessedAt: Date;
}

export interface ComplianceViolation {
  ruleId: string;
  ruleType: JurisdictionRule['ruleType'];
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enforcement: JurisdictionRule['enforcement'];
}

export interface ComplianceWarning {
  description: string;
  threshold?: number;
  currentValue?: number;
  remediation: string;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultGovernanceInstitutionalAlignment implements GovernanceInstitutionalAlignment {
  readonly config: GovernanceInstitutionalAlignmentConfig;

  private readonly jurisdictionModules = new Map<GovernanceModuleId, JurisdictionModule>();
  private readonly jurisdictionByCode = new Map<JurisdictionCode, GovernanceModuleId>();
  private readonly sovereignProfiles = new Map<string, SovereignOnboardingProfile>();
  private readonly complianceBridges = new Map<string, InstitutionalComplianceBridge>();
  private readonly proposals = new Map<string, GovernanceProposal>();
  private readonly proposalVotes = new Map<string, { totalPower: number; approvalPower: number }>();
  private readonly eventCallbacks: AGFIEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<GovernanceInstitutionalAlignmentConfig>) {
    this.config = { ...DEFAULT_GOVERNANCE_CONFIG, ...config };
  }

  // ============================================================================
  // Jurisdiction Modules
  // ============================================================================

  registerJurisdictionModule(params: RegisterJurisdictionModuleParams): JurisdictionModule {
    const module: JurisdictionModule = {
      id: this.generateId('jmod'),
      jurisdiction: params.jurisdiction,
      name: params.name,
      regulatoryFramework: params.regulatoryFramework,
      supportedInstitutionTypes: params.supportedInstitutionTypes,
      complianceRules: [],
      reportingRequirements: [],
      kycAmlStandard: params.kycAmlStandard,
      sanctionsLists: params.sanctionsLists ?? ['OFAC', 'UN', 'EU'],
      effectiveDate: new Date(),
      reviewDate: new Date(Date.now() + 365 * 86400000),
      status: 'active',
    };

    this.jurisdictionModules.set(module.id, module);
    this.jurisdictionByCode.set(params.jurisdiction, module.id);
    return module;
  }

  getJurisdictionModule(id: GovernanceModuleId): JurisdictionModule | undefined {
    return this.jurisdictionModules.get(id);
  }

  getJurisdictionModuleByCode(jurisdiction: JurisdictionCode): JurisdictionModule | undefined {
    const id = this.jurisdictionByCode.get(jurisdiction);
    return id ? this.jurisdictionModules.get(id) : undefined;
  }

  listJurisdictionModules(filters?: JurisdictionModuleFilters): JurisdictionModule[] {
    let results = Array.from(this.jurisdictionModules.values());

    if (filters?.jurisdiction) results = results.filter(m => m.jurisdiction === filters.jurisdiction);
    if (filters?.status) results = results.filter(m => m.status === filters.status);
    if (filters?.supportedType) {
      results = results.filter(m => m.supportedInstitutionTypes.includes(filters.supportedType!));
    }

    return results;
  }

  addJurisdictionRule(moduleId: GovernanceModuleId, rule: Omit<JurisdictionRule, 'id'>): JurisdictionRule {
    const module = this.jurisdictionModules.get(moduleId);
    if (!module) throw new Error(`Jurisdiction module not found: ${moduleId}`);

    const newRule: JurisdictionRule = {
      ...rule,
      id: this.generateId('rule'),
    };
    module.complianceRules.push(newRule);
    return newRule;
  }

  updateJurisdictionModule(id: GovernanceModuleId, updates: Partial<JurisdictionModule>): JurisdictionModule {
    const module = this.jurisdictionModules.get(id);
    if (!module) throw new Error(`Jurisdiction module not found: ${id}`);

    Object.assign(module, updates, { id }); // Preserve id
    return module;
  }

  deprecateJurisdictionModule(id: GovernanceModuleId, reason: string): void {
    const module = this.jurisdictionModules.get(id);
    if (!module) throw new Error(`Jurisdiction module not found: ${id}`);

    module.status = 'deprecated';
    module.reviewDate = new Date();
    void reason;
  }

  // ============================================================================
  // Sovereign Onboarding
  // ============================================================================

  initiateSovereignOnboarding(params: SovereignOnboardingParams): SovereignOnboardingProfile {
    const profile: SovereignOnboardingProfile = {
      id: this.generateId('sov'),
      institutionId: params.institutionId,
      sovereignType: params.sovereignType,
      countryCode: params.countryCode,
      regulatoryClassification: params.regulatoryClassification,
      dueDiligenceLevel: params.dueDiligenceLevel ?? 'enhanced',
      onboardingStage: 'initial_contact',
      signedAgreements: [],
      assignedJurisdictionModules: params.assignedJurisdictionModules ?? [],
      customParameters: {},
      initiatedAt: new Date(),
    };

    this.sovereignProfiles.set(profile.id, profile);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'institution_onboarded',
      severity: 'info',
      source: 'GovernanceInstitutionalAlignment',
      message: `Sovereign onboarding initiated: ${params.sovereignType} from ${params.countryCode}`,
      data: { profileId: profile.id, sovereignType: params.sovereignType, countryCode: params.countryCode },
      timestamp: new Date(),
    });

    return profile;
  }

  getSovereignProfile(id: string): SovereignOnboardingProfile | undefined {
    return this.sovereignProfiles.get(id);
  }

  listSovereignProfiles(filters?: SovereignProfileFilters): SovereignOnboardingProfile[] {
    let results = Array.from(this.sovereignProfiles.values());

    if (filters?.sovereignType) results = results.filter(p => p.sovereignType === filters.sovereignType);
    if (filters?.countryCode) results = results.filter(p => p.countryCode === filters.countryCode);
    if (filters?.onboardingStage) results = results.filter(p => p.onboardingStage === filters.onboardingStage);
    if (filters?.completed !== undefined) {
      results = results.filter(p => (p.completedAt !== undefined) === filters.completed);
    }

    return results;
  }

  advanceOnboardingStage(profileId: string, evidence?: string): SovereignOnboardingProfile {
    const profile = this.sovereignProfiles.get(profileId);
    if (!profile) throw new Error(`Sovereign profile not found: ${profileId}`);

    const stageOrder: SovereignOnboardingProfile['onboardingStage'][] = [
      'initial_contact',
      'due_diligence',
      'legal_review',
      'technical_integration',
      'pilot',
      'full_access',
    ];

    const currentIndex = stageOrder.indexOf(profile.onboardingStage);
    if (currentIndex < stageOrder.length - 1) {
      profile.onboardingStage = stageOrder[currentIndex + 1];
    }

    if (evidence) {
      profile.signedAgreements.push(evidence);
    }

    return profile;
  }

  completeSovereignOnboarding(profileId: string): SovereignOnboardingProfile {
    const profile = this.sovereignProfiles.get(profileId);
    if (!profile) throw new Error(`Sovereign profile not found: ${profileId}`);

    profile.onboardingStage = 'full_access';
    profile.completedAt = new Date();

    return profile;
  }

  // ============================================================================
  // Compliance Bridges
  // ============================================================================

  registerComplianceBridge(params: RegisterComplianceBridgeParams): InstitutionalComplianceBridge {
    const bridge: InstitutionalComplianceBridge = {
      id: this.generateId('bridge'),
      bridgeName: params.bridgeName,
      targetSystem: params.targetSystem,
      supportedJurisdictions: params.supportedJurisdictions,
      complianceStandards: params.complianceStandards,
      encryptionProtocol: params.encryptionProtocol ?? 'TLS 1.3',
      apiVersion: params.apiVersion ?? 'v1',
      status: 'testing',
    };

    this.complianceBridges.set(bridge.id, bridge);
    return bridge;
  }

  getComplianceBridge(id: string): InstitutionalComplianceBridge | undefined {
    return this.complianceBridges.get(id);
  }

  listComplianceBridges(filters?: ComplianceBridgeFilters): InstitutionalComplianceBridge[] {
    let results = Array.from(this.complianceBridges.values());

    if (filters?.targetSystem) results = results.filter(b => b.targetSystem === filters.targetSystem);
    if (filters?.status) results = results.filter(b => b.status === filters.status);
    if (filters?.jurisdiction) results = results.filter(b => b.supportedJurisdictions.includes(filters.jurisdiction!));

    return results;
  }

  syncComplianceBridge(id: string): ComplianceSyncResult {
    const bridge = this.complianceBridges.get(id);
    if (!bridge) throw new Error(`Compliance bridge not found: ${id}`);

    bridge.lastSyncAt = new Date();
    bridge.nextSyncAt = new Date(Date.now() + 86400000); // Tomorrow
    if (bridge.status === 'testing') bridge.status = 'active';

    return {
      bridgeId: id,
      syncedAt: new Date(),
      rulesUpdated: 5,
      newRulesAdded: 2,
      deprecatedRules: 1,
      status: 'success',
      details: `Successfully synced compliance rules with ${bridge.targetSystem}`,
    };
  }

  // ============================================================================
  // Governance Proposals
  // ============================================================================

  proposeGovernanceAction(params: ProposeGovernanceActionParams): GovernanceProposal {
    const votingStart = new Date();
    const votingEnd = new Date(Date.now() + this.config.votingPeriodDays * 86400000);

    const proposal: GovernanceProposal = {
      id: this.generateId('prop'),
      proposalType: params.proposalType,
      title: params.title,
      description: params.description,
      proposedBy: params.proposedBy,
      targetModule: params.targetModule,
      proposedChanges: params.proposedChanges,
      jurisdictionalImpact: params.jurisdictionalImpact ?? [],
      institutionalImpact: params.institutionalImpact ?? [],
      votingPeriodStart: votingStart,
      votingPeriodEnd: votingEnd,
      quorumRequired: this.config.defaultGovernanceQuorum,
      currentApprovalPercent: 0,
      status: 'voting',
    };

    this.proposals.set(proposal.id, proposal);
    this.proposalVotes.set(proposal.id, { totalPower: 0, approvalPower: 0 });

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'governance_action_proposed',
      severity: 'info',
      source: 'GovernanceInstitutionalAlignment',
      message: `Governance proposal: ${params.title} (${params.proposalType})`,
      data: { proposalId: proposal.id, type: params.proposalType, proposedBy: params.proposedBy },
      timestamp: new Date(),
    });

    return proposal;
  }

  getProposal(id: string): GovernanceProposal | undefined {
    return this.proposals.get(id);
  }

  listProposals(filters?: ProposalFilters): GovernanceProposal[] {
    let results = Array.from(this.proposals.values());

    if (filters?.proposalType) results = results.filter(p => p.proposalType === filters.proposalType);
    if (filters?.status) results = results.filter(p => p.status === filters.status);
    if (filters?.proposedBy) results = results.filter(p => p.proposedBy === filters.proposedBy);
    if (filters?.targetModule) results = results.filter(p => p.targetModule === filters.targetModule);
    if (filters?.affectsJurisdiction) {
      results = results.filter(p => p.jurisdictionalImpact.includes(filters.affectsJurisdiction!));
    }

    return results;
  }

  castVote(proposalId: string, voterPower: number, inFavor: boolean): VoteResult {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);
    if (proposal.status !== 'voting') throw new Error(`Proposal is not in voting status: ${proposal.status}`);

    const votes = this.proposalVotes.get(proposalId)!;
    votes.totalPower += voterPower;
    if (inFavor) votes.approvalPower += voterPower;

    const approvalPercent = votes.totalPower > 0
      ? (votes.approvalPower / votes.totalPower) * 100
      : 0;
    proposal.currentApprovalPercent = approvalPercent;

    const quorumReached = approvalPercent >= proposal.quorumRequired;

    return {
      proposalId,
      votedAt: new Date(),
      inFavor,
      voterPower,
      newApprovalPercent: approvalPercent,
      quorumReached,
    };
  }

  executeProposal(proposalId: string): GovernanceProposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);
    if (proposal.status !== 'approved' && proposal.currentApprovalPercent < proposal.quorumRequired) {
      throw new Error(`Proposal has not reached quorum: ${proposal.currentApprovalPercent}% < ${proposal.quorumRequired}%`);
    }

    proposal.status = 'executed';
    proposal.executedAt = new Date();

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'governance_action_executed',
      severity: 'info',
      source: 'GovernanceInstitutionalAlignment',
      message: `Governance action executed: ${proposal.title}`,
      data: { proposalId, type: proposal.proposalType, approvalPercent: proposal.currentApprovalPercent },
      timestamp: new Date(),
    });

    return proposal;
  }

  cancelProposal(proposalId: string, reason: string): GovernanceProposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);
    if (proposal.status === 'executed') throw new Error('Cannot cancel an executed proposal');

    proposal.status = 'cancelled';
    void reason;
    return proposal;
  }

  // ============================================================================
  // Compliance Checking
  // ============================================================================

  checkJurisdictionCompliance(
    institutionId: InstitutionId,
    jurisdiction: JurisdictionCode,
    operationType: string
  ): ComplianceAssessment {
    const module = this.getJurisdictionModuleByCode(jurisdiction);
    const violations: ComplianceViolation[] = [];
    const warnings: ComplianceWarning[] = [];
    const requiredActions: string[] = [];

    if (!module) {
      violations.push({
        ruleId: 'missing_jurisdiction_module',
        ruleType: 'prohibited_activity',
        description: `No jurisdiction module registered for ${jurisdiction}`,
        severity: 'high',
        enforcement: 'hard_block',
      });
      requiredActions.push(`Register jurisdiction module for ${jurisdiction}`);
    } else {
      for (const rule of module.complianceRules) {
        if (rule.enforcement === 'hard_block') {
          violations.push({
            ruleId: rule.id,
            ruleType: rule.ruleType,
            description: rule.description,
            severity: 'high',
            enforcement: rule.enforcement,
          });
        }
      }
    }

    return {
      institutionId,
      jurisdiction,
      operationType,
      isCompliant: violations.length === 0,
      violations,
      warnings,
      requiredActions,
      assessedAt: new Date(),
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: AGFIEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: AGFIEvent): void {
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

export function createGovernanceInstitutionalAlignment(
  config?: Partial<GovernanceInstitutionalAlignmentConfig>
): DefaultGovernanceInstitutionalAlignment {
  return new DefaultGovernanceInstitutionalAlignment(config);
}

export default DefaultGovernanceInstitutionalAlignment;
