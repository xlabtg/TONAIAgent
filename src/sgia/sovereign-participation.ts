/**
 * TONAIAgent - SGIA Sovereign Participation Modes
 *
 * Manages sovereign participation profiles, modes, privileges, and governance rights
 * for the three primary participation modes: Observer, Allocator, and Strategic Partner.
 * Additional modes include Regulatory Node and Custodian Partner for specialized roles.
 *
 * This is Domain 6 of the Sovereign-Grade Institutional Alignment (SGIA) framework.
 */

import {
  ParticipationProfile,
  ParticipationPrivilege,
  ParticipationRestriction,
  ParticipationAllocation,
  GovernanceRights,
  ParticipationId,
  SovereignEntityId,
  SovereignEntityType,
  ParticipationMode,
  SovereignParticipationConfig,
  SGIAEvent,
  SGIAEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_SOVEREIGN_PARTICIPATION_CONFIG: SovereignParticipationConfig = {
  enableObserverMode: true,
  enableAllocatorMode: true,
  enableStrategicPartnerMode: true,
  enableRegulatoryNodeMode: true,
  enableCustodianPartnerMode: true,
  requireGovernanceApprovalForUpgrade: true,
  participationReviewIntervalDays: 90,
};

// ============================================================================
// Participation Mode Defaults
// ============================================================================

const PARTICIPATION_MODE_DEFAULTS: Record<ParticipationMode, {
  privileges: Omit<ParticipationPrivilege, 'grantedAt'>[];
  governance: Partial<GovernanceRights>;
}> = {
  observer: {
    privileges: [
      { privilegeType: 'read_only', scope: ['vault_status', 'market_data', 'protocol_metrics'] },
      { privilegeType: 'audit', scope: ['public_reports', 'compliance_summaries'] },
    ],
    governance: { canVote: false, votingWeight: 0, canPropose: false, proposalCategories: [], canVeto: false, vetoScope: [] },
  },
  allocator: {
    privileges: [
      { privilegeType: 'read_only', scope: ['vault_status', 'market_data', 'protocol_metrics', 'fund_performance'] },
      { privilegeType: 'allocate', scope: ['permitted_fund_classes', 'sovereign_vaults'] },
      { privilegeType: 'audit', scope: ['own_positions', 'compliance_reports'] },
    ],
    governance: { canVote: true, votingWeight: 5, canPropose: false, proposalCategories: [], canVeto: false, vetoScope: [] },
  },
  strategic_partner: {
    privileges: [
      { privilegeType: 'read_only', scope: ['all_public', 'strategic_reports', 'roadmap'] },
      { privilegeType: 'allocate', scope: ['all_fund_classes', 'all_vaults'] },
      { privilegeType: 'govern', scope: ['strategic_proposals', 'parameter_updates'] },
      { privilegeType: 'audit', scope: ['all_own_positions', 'full_compliance'] },
    ],
    governance: { canVote: true, votingWeight: 20, canPropose: true, proposalCategories: ['parameter_update', 'strategic_direction'], canVeto: false, vetoScope: [] },
  },
  regulatory_node: {
    privileges: [
      { privilegeType: 'read_only', scope: ['all_compliance_data', 'regulatory_reports', 'aml_flags'] },
      { privilegeType: 'audit', scope: ['full_audit_trail', 'compliance_reports', 'aml_reports'] },
    ],
    governance: { canVote: true, votingWeight: 10, canPropose: true, proposalCategories: ['compliance_update', 'jurisdiction_rules'], canVeto: true, vetoScope: ['regulatory_breach_actions'] },
  },
  custodian_partner: {
    privileges: [
      { privilegeType: 'read_only', scope: ['vault_assets', 'custody_requests', 'settlement_reports'] },
      { privilegeType: 'custody', scope: ['assigned_vaults', 'custodial_transfers'] },
      { privilegeType: 'audit', scope: ['own_custodial_operations'] },
    ],
    governance: { canVote: true, votingWeight: 3, canPropose: false, proposalCategories: [], canVeto: false, vetoScope: [] },
  },
};

// ============================================================================
// Interface
// ============================================================================

export interface SovereignParticipationManager {
  readonly config: SovereignParticipationConfig;

  // Participation Registration
  registerParticipant(params: RegisterParticipantParams): ParticipationProfile;
  getParticipant(id: ParticipationId): ParticipationProfile | undefined;
  getParticipantByEntity(entityId: SovereignEntityId): ParticipationProfile | undefined;
  listParticipants(filters?: ParticipantFilters): ParticipationProfile[];
  upgradeParticipationMode(participantId: ParticipationId, newMode: ParticipationMode, justification: string): ParticipationProfile;
  suspendParticipant(participantId: ParticipationId, reason: string): ParticipationProfile;
  terminateParticipant(participantId: ParticipationId, reason: string): ParticipationProfile;

  // Privileges & Restrictions
  addPrivilege(participantId: ParticipationId, privilege: Omit<ParticipationPrivilege, 'grantedAt'>): ParticipationProfile;
  revokePrivilege(participantId: ParticipationId, privilegeType: ParticipationPrivilege['privilegeType']): ParticipationProfile;
  addRestriction(participantId: ParticipationId, restriction: ParticipationRestriction): ParticipationProfile;
  removeRestriction(participantId: ParticipationId, restrictionType: ParticipationRestriction['restrictionType']): ParticipationProfile;

  // Allocations
  setAllocation(participantId: ParticipationId, allocation: ParticipationAllocation): ParticipationProfile;
  updateAllocation(participantId: ParticipationId, assetClass: string, updates: Partial<ParticipationAllocation>): ParticipationProfile;

  // Governance
  updateGovernanceRights(participantId: ParticipationId, rights: Partial<GovernanceRights>): ParticipationProfile;

  // Summary
  getParticipationSummary(): ParticipationSummary;

  // Events
  onEvent(callback: SGIAEventCallback): void;
}

// ============================================================================
// Parameter and Result Types
// ============================================================================

export interface RegisterParticipantParams {
  entityId: SovereignEntityId;
  entityName: string;
  entityType: SovereignEntityType;
  participationMode: ParticipationMode;
  agreementIds?: string[];
  customPrivileges?: Omit<ParticipationPrivilege, 'grantedAt'>[];
  customRestrictions?: ParticipationRestriction[];
}

export interface ParticipantFilters {
  entityType?: SovereignEntityType;
  participationMode?: ParticipationMode;
  status?: ParticipationProfile['status'];
}

export interface ParticipationSummary {
  totalParticipants: number;
  byMode: Record<ParticipationMode, number>;
  byEntityType: Partial<Record<SovereignEntityType, number>>;
  activeParticipants: number;
  suspendedParticipants: number;
  totalVotingWeight: number;
  generatedAt: Date;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultSovereignParticipationManager implements SovereignParticipationManager {
  readonly config: SovereignParticipationConfig;

  private readonly participants = new Map<ParticipationId, ParticipationProfile>();
  private readonly participantsByEntity = new Map<SovereignEntityId, ParticipationId>();
  private readonly eventCallbacks: SGIAEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<SovereignParticipationConfig>) {
    this.config = { ...DEFAULT_SOVEREIGN_PARTICIPATION_CONFIG, ...config };
  }

  // ============================================================================
  // Participation Registration
  // ============================================================================

  registerParticipant(params: RegisterParticipantParams): ParticipationProfile {
    this.validateModeEnabled(params.participationMode);

    const modeDefaults = PARTICIPATION_MODE_DEFAULTS[params.participationMode];
    const now = new Date();

    const basePrivileges: ParticipationPrivilege[] = modeDefaults.privileges.map(p => ({
      ...p,
      grantedAt: now,
    }));

    const customPrivileges: ParticipationPrivilege[] = (params.customPrivileges ?? []).map(p => ({
      ...p,
      grantedAt: now,
    }));

    const governanceRights: GovernanceRights = {
      canVote: modeDefaults.governance.canVote ?? false,
      votingWeight: modeDefaults.governance.votingWeight ?? 0,
      canPropose: modeDefaults.governance.canPropose ?? false,
      proposalCategories: modeDefaults.governance.proposalCategories ?? [],
      canVeto: modeDefaults.governance.canVeto ?? false,
      vetoScope: modeDefaults.governance.vetoScope ?? [],
    };

    const profile: ParticipationProfile = {
      id: this.generateId('part'),
      entityId: params.entityId,
      entityName: params.entityName,
      entityType: params.entityType,
      participationMode: params.participationMode,
      privileges: [...basePrivileges, ...customPrivileges],
      restrictions: params.customRestrictions ?? [],
      allocations: [],
      governanceRights,
      agreementIds: params.agreementIds ?? [],
      status: 'active',
      registeredAt: now,
      lastReviewAt: now,
      nextReviewAt: new Date(now.getTime() + this.config.participationReviewIntervalDays * 86400000),
    };

    this.participants.set(profile.id, profile);
    this.participantsByEntity.set(params.entityId, profile.id);

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'participation_registered',
      severity: 'info',
      source: 'SovereignParticipationManager',
      message: `Participant registered: ${params.entityName} as ${params.participationMode}`,
      data: { participantId: profile.id, entityId: params.entityId, mode: params.participationMode },
      timestamp: now,
    });

    return profile;
  }

  getParticipant(id: ParticipationId): ParticipationProfile | undefined {
    return this.participants.get(id);
  }

  getParticipantByEntity(entityId: SovereignEntityId): ParticipationProfile | undefined {
    const id = this.participantsByEntity.get(entityId);
    return id ? this.participants.get(id) : undefined;
  }

  listParticipants(filters?: ParticipantFilters): ParticipationProfile[] {
    let results = Array.from(this.participants.values());

    if (filters?.entityType) results = results.filter(p => p.entityType === filters.entityType);
    if (filters?.participationMode) results = results.filter(p => p.participationMode === filters.participationMode);
    if (filters?.status) results = results.filter(p => p.status === filters.status);

    return results;
  }

  upgradeParticipationMode(
    participantId: ParticipationId,
    newMode: ParticipationMode,
    justification: string
  ): ParticipationProfile {
    const profile = this.participants.get(participantId);
    if (!profile) throw new Error(`Participant not found: ${participantId}`);

    this.validateModeEnabled(newMode);

    const previousMode = profile.participationMode;
    const modeDefaults = PARTICIPATION_MODE_DEFAULTS[newMode];
    const now = new Date();

    // Replace privileges with new mode defaults
    profile.participationMode = newMode;
    profile.privileges = modeDefaults.privileges.map(p => ({ ...p, grantedAt: now }));
    profile.governanceRights = {
      canVote: modeDefaults.governance.canVote ?? false,
      votingWeight: modeDefaults.governance.votingWeight ?? 0,
      canPropose: modeDefaults.governance.canPropose ?? false,
      proposalCategories: modeDefaults.governance.proposalCategories ?? [],
      canVeto: modeDefaults.governance.canVeto ?? false,
      vetoScope: modeDefaults.governance.vetoScope ?? [],
    };
    profile.lastReviewAt = now;

    void justification;

    this.emitEvent({
      id: this.generateId('evt'),
      type: 'participation_mode_changed',
      severity: 'info',
      source: 'SovereignParticipationManager',
      message: `Participation mode changed for ${profile.entityName}: ${previousMode} → ${newMode}`,
      data: { participantId, entityId: profile.entityId, previousMode, newMode },
      timestamp: now,
    });

    return profile;
  }

  suspendParticipant(participantId: ParticipationId, reason: string): ParticipationProfile {
    const profile = this.participants.get(participantId);
    if (!profile) throw new Error(`Participant not found: ${participantId}`);

    profile.status = 'suspended';
    void reason;
    return profile;
  }

  terminateParticipant(participantId: ParticipationId, reason: string): ParticipationProfile {
    const profile = this.participants.get(participantId);
    if (!profile) throw new Error(`Participant not found: ${participantId}`);

    profile.status = 'terminated';
    void reason;
    return profile;
  }

  // ============================================================================
  // Privileges & Restrictions
  // ============================================================================

  addPrivilege(
    participantId: ParticipationId,
    privilege: Omit<ParticipationPrivilege, 'grantedAt'>
  ): ParticipationProfile {
    const profile = this.participants.get(participantId);
    if (!profile) throw new Error(`Participant not found: ${participantId}`);

    profile.privileges.push({ ...privilege, grantedAt: new Date() });
    return profile;
  }

  revokePrivilege(
    participantId: ParticipationId,
    privilegeType: ParticipationPrivilege['privilegeType']
  ): ParticipationProfile {
    const profile = this.participants.get(participantId);
    if (!profile) throw new Error(`Participant not found: ${participantId}`);

    profile.privileges = profile.privileges.filter(p => p.privilegeType !== privilegeType);
    return profile;
  }

  addRestriction(participantId: ParticipationId, restriction: ParticipationRestriction): ParticipationProfile {
    const profile = this.participants.get(participantId);
    if (!profile) throw new Error(`Participant not found: ${participantId}`);

    profile.restrictions.push(restriction);
    return profile;
  }

  removeRestriction(
    participantId: ParticipationId,
    restrictionType: ParticipationRestriction['restrictionType']
  ): ParticipationProfile {
    const profile = this.participants.get(participantId);
    if (!profile) throw new Error(`Participant not found: ${participantId}`);

    profile.restrictions = profile.restrictions.filter(r => r.restrictionType !== restrictionType);
    return profile;
  }

  // ============================================================================
  // Allocations
  // ============================================================================

  setAllocation(participantId: ParticipationId, allocation: ParticipationAllocation): ParticipationProfile {
    const profile = this.participants.get(participantId);
    if (!profile) throw new Error(`Participant not found: ${participantId}`);

    const existing = profile.allocations.findIndex(a => a.assetClass === allocation.assetClass);
    if (existing >= 0) {
      profile.allocations[existing] = allocation;
    } else {
      profile.allocations.push(allocation);
    }

    return profile;
  }

  updateAllocation(
    participantId: ParticipationId,
    assetClass: string,
    updates: Partial<ParticipationAllocation>
  ): ParticipationProfile {
    const profile = this.participants.get(participantId);
    if (!profile) throw new Error(`Participant not found: ${participantId}`);

    const allocation = profile.allocations.find(a => a.assetClass === assetClass);
    if (!allocation) throw new Error(`Allocation not found for asset class: ${assetClass}`);

    Object.assign(allocation, updates, { assetClass });
    return profile;
  }

  // ============================================================================
  // Governance
  // ============================================================================

  updateGovernanceRights(participantId: ParticipationId, rights: Partial<GovernanceRights>): ParticipationProfile {
    const profile = this.participants.get(participantId);
    if (!profile) throw new Error(`Participant not found: ${participantId}`);

    Object.assign(profile.governanceRights, rights);
    return profile;
  }

  // ============================================================================
  // Summary
  // ============================================================================

  getParticipationSummary(): ParticipationSummary {
    const all = Array.from(this.participants.values());

    const byMode: Record<ParticipationMode, number> = {
      observer: 0,
      allocator: 0,
      strategic_partner: 0,
      regulatory_node: 0,
      custodian_partner: 0,
    };

    const byEntityType: Partial<Record<SovereignEntityType, number>> = {};
    let totalVotingWeight = 0;
    let activeCount = 0;
    let suspendedCount = 0;

    for (const p of all) {
      byMode[p.participationMode]++;
      byEntityType[p.entityType] = (byEntityType[p.entityType] ?? 0) + 1;

      if (p.status === 'active') {
        activeCount++;
        totalVotingWeight += p.governanceRights.votingWeight;
      }
      if (p.status === 'suspended') suspendedCount++;
    }

    return {
      totalParticipants: all.length,
      byMode,
      byEntityType,
      activeParticipants: activeCount,
      suspendedParticipants: suspendedCount,
      totalVotingWeight,
      generatedAt: new Date(),
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private validateModeEnabled(mode: ParticipationMode): void {
    const modeMap: Record<ParticipationMode, boolean> = {
      observer: this.config.enableObserverMode,
      allocator: this.config.enableAllocatorMode,
      strategic_partner: this.config.enableStrategicPartnerMode,
      regulatory_node: this.config.enableRegulatoryNodeMode,
      custodian_partner: this.config.enableCustodianPartnerMode,
    };

    if (!modeMap[mode]) {
      throw new Error(`Participation mode is not enabled: ${mode}`);
    }
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

export function createSovereignParticipationManager(
  config?: Partial<SovereignParticipationConfig>
): DefaultSovereignParticipationManager {
  return new DefaultSovereignParticipationManager(config);
}

export default DefaultSovereignParticipationManager;
