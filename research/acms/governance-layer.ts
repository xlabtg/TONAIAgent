/**
 * ACMS Layer 9 — Governance Layer
 *
 * DAO governance and parameter management for the ACMS:
 * on-chain proposals, multi-tier voting, parameter registry,
 * and emergency override mechanisms.
 * Provides the governance backbone for the entire ACMS stack.
 */

import {
  ProposalId,
  ParticipantId,
  LayerId,
  GovernanceProposal,
  ProposalType,
  ProposalStatus,
  GovernanceVote,
  ParameterRegistry,
  EmergencyOverride,
  GovernanceLayerStatus,
  ACMSEvent,
  ACMSEventCallback,
} from './types';

// ============================================================================
// Governance Layer Interfaces
// ============================================================================

export interface GovernanceLayerManager {
  createProposal(params: CreateProposalParams): GovernanceProposal;
  cancelProposal(proposalId: ProposalId, reason: string): void;
  castVote(proposalId: ProposalId, params: CastVoteParams): GovernanceVote;
  finalizeProposal(proposalId: ProposalId): ProposalFinalizeResult;
  executeProposal(proposalId: ProposalId): void;
  getProposal(proposalId: ProposalId): GovernanceProposal | undefined;
  listProposals(filters?: ProposalFilters): GovernanceProposal[];
  getVotes(proposalId: ProposalId): GovernanceVote[];

  registerParameter(params: RegisterParameterParams): ParameterRegistry;
  updateParameter(layer: LayerId, parameter: string, value: unknown, proposalId: ProposalId): ParameterRegistry;
  getParameter(layer: LayerId, parameter: string): ParameterRegistry | undefined;
  listParameters(layer?: LayerId): ParameterRegistry[];

  activateEmergencyOverride(params: ActivateOverrideParams): EmergencyOverride;
  resolveEmergencyOverride(overrideId: string): void;
  getEmergencyOverride(overrideId: string): EmergencyOverride | undefined;
  listEmergencyOverrides(activeOnly?: boolean): EmergencyOverride[];

  getLayerStatus(): GovernanceLayerStatus;
  onEvent(callback: ACMSEventCallback): void;
}

export interface CreateProposalParams {
  type: ProposalType;
  title: string;
  description: string;
  proposerId: ParticipantId;
  targetLayer: LayerId;
  targetParameter?: string;
  proposedValue?: unknown;
  currentValue?: unknown;
  votingDurationHours: number;
  quorumRequired: number;  // Voting power needed
  discussionUrl?: string;
}

export interface CastVoteParams {
  voterId: ParticipantId;
  vote: 'for' | 'against' | 'abstain';
  votingPower: number;
  reason?: string;
}

export interface ProposalFinalizeResult {
  proposalId: ProposalId;
  status: ProposalStatus;
  finalVotesFor: number;
  finalVotesAgainst: number;
  quorumReached: boolean;
  passed: boolean;
  finalizedAt: Date;
}

export interface ProposalFilters {
  type?: ProposalType;
  status?: ProposalStatus;
  targetLayer?: LayerId;
  proposerId?: ParticipantId;
}

export interface RegisterParameterParams {
  layer: LayerId;
  parameter: string;
  currentValue: unknown;
  minValue?: number;
  maxValue?: number;
  description: string;
  initialProposalId: ProposalId;
}

export interface ActivateOverrideParams {
  type: EmergencyOverride['type'];
  triggeredBy: ParticipantId;
  reason: string;
  affectedLayer: LayerId;
  affectedEntityId?: string;
  expectedDurationMinutes?: number;
}

// ============================================================================
// Default Governance Layer Manager
// ============================================================================

export class DefaultGovernanceLayerManager implements GovernanceLayerManager {
  private readonly proposals: Map<ProposalId, GovernanceProposal> = new Map();
  private readonly votes: Map<ProposalId, GovernanceVote[]> = new Map();
  private readonly parameters: Map<string, ParameterRegistry> = new Map();
  private readonly overrides: Map<string, EmergencyOverride> = new Map();
  private readonly cancelReasons: Map<ProposalId, string> = new Map();
  private readonly eventCallbacks: ACMSEventCallback[] = [];
  private idCounter = 0;

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.idCounter}`;
  }

  private paramKey(layer: LayerId, parameter: string): string {
    return `${layer}:${parameter}`;
  }

  createProposal(params: CreateProposalParams): GovernanceProposal {
    const proposal: GovernanceProposal = {
      id: this.generateId('prop') as ProposalId,
      type: params.type,
      title: params.title,
      description: params.description,
      proposerId: params.proposerId,
      targetLayer: params.targetLayer,
      targetParameter: params.targetParameter,
      proposedValue: params.proposedValue,
      currentValue: params.currentValue,
      votesFor: 0,
      votesAgainst: 0,
      quorumRequired: params.quorumRequired,
      status: 'active',
      discussionUrl: params.discussionUrl,
      createdAt: new Date(),
      votingEndsAt: new Date(Date.now() + params.votingDurationHours * 60 * 60 * 1000),
    };
    this.proposals.set(proposal.id, proposal);
    this.votes.set(proposal.id, []);
    return proposal;
  }

  cancelProposal(proposalId: ProposalId, reason: string): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);
    if (proposal.status !== 'active' && proposal.status !== 'draft') {
      throw new Error(`Cannot cancel proposal in status: ${proposal.status}`);
    }
    this.proposals.set(proposalId, { ...proposal, status: 'cancelled' });
    this.cancelReasons.set(proposalId, reason);
  }

  castVote(proposalId: ProposalId, params: CastVoteParams): GovernanceVote {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);
    if (proposal.status !== 'active') throw new Error(`Proposal ${proposalId} is not active`);

    const vote: GovernanceVote = {
      id: this.generateId('vote'),
      proposalId,
      voterId: params.voterId,
      vote: params.vote,
      votingPower: params.votingPower,
      reason: params.reason,
      votedAt: new Date(),
    };

    const proposalVotes = this.votes.get(proposalId) ?? [];
    // Remove any prior vote from this voter
    const filtered = proposalVotes.filter(v => v.voterId !== params.voterId);
    filtered.push(vote);
    this.votes.set(proposalId, filtered);

    // Update proposal vote totals
    const votesFor = filtered.filter(v => v.vote === 'for').reduce((s, v) => s + v.votingPower, 0);
    const votesAgainst = filtered.filter(v => v.vote === 'against').reduce((s, v) => s + v.votingPower, 0);
    this.proposals.set(proposalId, { ...proposal, votesFor, votesAgainst });

    return vote;
  }

  finalizeProposal(proposalId: ProposalId): ProposalFinalizeResult {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    const quorumReached = totalVotes >= proposal.quorumRequired;
    const passed = quorumReached && proposal.votesFor > proposal.votesAgainst;
    const status: ProposalStatus = passed ? 'passed' : 'rejected';

    this.proposals.set(proposalId, { ...proposal, status });
    if (passed) {
      this.emitEvent('governance_proposal_passed', 9, {
        proposalId,
        title: proposal.title,
        targetLayer: proposal.targetLayer,
      });
    }

    return {
      proposalId,
      status,
      finalVotesFor: proposal.votesFor,
      finalVotesAgainst: proposal.votesAgainst,
      quorumReached,
      passed,
      finalizedAt: new Date(),
    };
  }

  executeProposal(proposalId: ProposalId): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);
    if (proposal.status !== 'passed') throw new Error(`Proposal ${proposalId} has not passed`);
    this.proposals.set(proposalId, {
      ...proposal,
      status: 'executed',
      executedAt: new Date(),
    });
  }

  getProposal(proposalId: ProposalId): GovernanceProposal | undefined {
    return this.proposals.get(proposalId);
  }

  listProposals(filters?: ProposalFilters): GovernanceProposal[] {
    let result = Array.from(this.proposals.values());
    if (filters?.type) result = result.filter(p => p.type === filters.type);
    if (filters?.status) result = result.filter(p => p.status === filters.status);
    if (filters?.targetLayer) result = result.filter(p => p.targetLayer === filters.targetLayer);
    if (filters?.proposerId) result = result.filter(p => p.proposerId === filters.proposerId);
    return result;
  }

  getVotes(proposalId: ProposalId): GovernanceVote[] {
    return this.votes.get(proposalId) ?? [];
  }

  registerParameter(params: RegisterParameterParams): ParameterRegistry {
    const key = this.paramKey(params.layer, params.parameter);
    const entry: ParameterRegistry = {
      layer: params.layer,
      parameter: params.parameter,
      currentValue: params.currentValue,
      minValue: params.minValue,
      maxValue: params.maxValue,
      lastChangedAt: new Date(),
      lastChangedByProposal: params.initialProposalId,
      description: params.description,
    };
    this.parameters.set(key, entry);
    return entry;
  }

  updateParameter(layer: LayerId, parameter: string, value: unknown, proposalId: ProposalId): ParameterRegistry {
    const key = this.paramKey(layer, parameter);
    const existing = this.parameters.get(key);
    if (!existing) throw new Error(`Parameter ${parameter} on layer ${layer} not found`);
    const updated: ParameterRegistry = {
      ...existing,
      currentValue: value,
      lastChangedAt: new Date(),
      lastChangedByProposal: proposalId,
    };
    this.parameters.set(key, updated);
    return updated;
  }

  getParameter(layer: LayerId, parameter: string): ParameterRegistry | undefined {
    return this.parameters.get(this.paramKey(layer, parameter));
  }

  listParameters(layer?: LayerId): ParameterRegistry[] {
    const all = Array.from(this.parameters.values());
    if (layer !== undefined) return all.filter(p => p.layer === layer);
    return all;
  }

  activateEmergencyOverride(params: ActivateOverrideParams): EmergencyOverride {
    const override: EmergencyOverride = {
      id: this.generateId('override'),
      type: params.type,
      triggeredBy: params.triggeredBy,
      reason: params.reason,
      affectedLayer: params.affectedLayer,
      affectedEntityId: params.affectedEntityId,
      activatedAt: new Date(),
      expectedDuration: params.expectedDurationMinutes,
      isActive: true,
    };
    this.overrides.set(override.id, override);
    this.emitEvent('emergency_override_activated', 9, {
      overrideId: override.id,
      type: override.type,
      affectedLayer: override.affectedLayer,
    });
    return override;
  }

  resolveEmergencyOverride(overrideId: string): void {
    const override = this.overrides.get(overrideId);
    if (!override) throw new Error(`Override ${overrideId} not found`);
    this.overrides.set(overrideId, { ...override, isActive: false, resolvedAt: new Date() });
  }

  getEmergencyOverride(overrideId: string): EmergencyOverride | undefined {
    return this.overrides.get(overrideId);
  }

  listEmergencyOverrides(activeOnly = false): EmergencyOverride[] {
    const all = Array.from(this.overrides.values());
    if (activeOnly) return all.filter(o => o.isActive);
    return all;
  }

  getLayerStatus(): GovernanceLayerStatus {
    const proposals = Array.from(this.proposals.values());
    const allVotes = Array.from(this.votes.values()).flat();
    const uniqueVoters = new Set(allVotes.map(v => v.voterId));
    const activeProposals = proposals.filter(p => p.status === 'active');
    const passedProposals = proposals.filter(p => p.status === 'passed' || p.status === 'executed');
    const overrides = Array.from(this.overrides.values());
    const activeOverrides = overrides.filter(o => o.isActive);

    const participationRate = proposals.length > 0
      ? activeProposals.length / proposals.length
      : 0;

    return {
      activeProposals: activeProposals.length,
      passedProposals: passedProposals.length,
      totalVoters: uniqueVoters.size,
      averageParticipationRate: Math.round(participationRate * 100) / 100,
      parametersManaged: this.parameters.size,
      activeEmergencyOverrides: activeOverrides.length,
    };
  }

  onEvent(callback: ACMSEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(type: ACMSEvent['type'], layer: ACMSEvent['layer'], data: Record<string, unknown>): void {
    const event: ACMSEvent = { type, layer, timestamp: new Date(), data };
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore */ }
    }
  }
}

export function createGovernanceLayerManager(): DefaultGovernanceLayerManager {
  return new DefaultGovernanceLayerManager();
}
