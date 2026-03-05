/**
 * TONAIAgent - GAAMP Governance Layer
 *
 * Implements the Governance Layer of the Global Autonomous Asset Management Protocol.
 * Provides DAO-controlled protocol evolution with on-chain voting, parameter tuning,
 * risk threshold management, insurance pool governance, and upgrade mechanisms.
 *
 * Governance flow:
 * 1. Participant submits proposal
 * 2. Voting period opens
 * 3. Token holders vote (yes / no / abstain)
 * 4. If quorum & threshold met → execution delay
 * 5. Proposal executed on-chain
 */

import {
  ParticipantId,
  ProposalId,
  GovernanceProposal,
  ProposalType,
  ProposalStatus,
  Vote,
  VotingPower,
  ProtocolParameters,
  InsurancePool,
  GovernanceLayerConfig,
  GAMPEvent,
  GAMPEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_GOVERNANCE_LAYER_CONFIG: GovernanceLayerConfig = {
  daoEnabled: true,
  votingPeriodDays: 7,
  quorumPercent: 10,
  approvalThresholdPercent: 51,
  executionDelayDays: 2,
  emergencyActionsEnabled: true,
};

const DEFAULT_PROTOCOL_PARAMETERS: ProtocolParameters = {
  maxAgentsPerFund: 20,
  maxFundAUM: 1_000_000_000,
  minMarginRatio: 0.1,
  defaultLeverage: 2.0,
  settlementWindow: 4,
  defaultResolutionThreshold: 0.5,
  insurancePoolReserveRatio: 0.05,
  protocolFeePercent: 0.1,
  governanceQuorum: 10,
  governanceApprovalThreshold: 51,
  votingPeriodDays: 7,
  executionDelayDays: 2,
};

// ============================================================================
// Interfaces
// ============================================================================

export interface GovernanceLayer {
  readonly config: GovernanceLayerConfig;
  readonly parameters: ProtocolParameters;

  // Voting power
  setVotingPower(participantId: ParticipantId, power: VotingPower): void;
  getVotingPower(participantId: ParticipantId): VotingPower;
  getTotalVotingPower(): VotingPower;

  // Proposals
  submitProposal(params: SubmitProposalParams): GovernanceProposal;
  cancelProposal(proposalId: ProposalId, reason?: string): GovernanceProposal;
  getProposal(proposalId: ProposalId): GovernanceProposal | undefined;
  listProposals(filters?: ProposalFilters): GovernanceProposal[];

  // Voting
  castVote(params: CastVoteParams): Vote;
  hasVoted(proposalId: ProposalId, participantId: ParticipantId): boolean;
  getVotes(proposalId: ProposalId): Vote[];

  // Lifecycle
  finalizeProposal(proposalId: ProposalId): GovernanceProposal;
  executeProposal(proposalId: ProposalId): GovernanceProposal;

  // Parameter access
  getParameters(): ProtocolParameters;
  updateParameter(key: keyof ProtocolParameters, value: number): void;

  // Emergency actions
  emergencyPause(reason: string): void;
  emergencyUnpause(): void;
  isPaused(): boolean;

  onEvent(callback: GAMPEventCallback): void;
}

export interface SubmitProposalParams {
  title: string;
  description: string;
  type: ProposalType;
  proposerId: ParticipantId;
  parameters: Record<string, unknown>;
  votingDeadline?: Date;
  executionDelay?: number;
}

export interface ProposalFilters {
  status?: ProposalStatus;
  type?: ProposalType;
  proposerId?: ParticipantId;
}

export interface CastVoteParams {
  proposalId: ProposalId;
  voterId: ParticipantId;
  decision: Vote['decision'];
  rationale?: string;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultGovernanceLayer implements GovernanceLayer {
  readonly config: GovernanceLayerConfig;
  private _parameters: ProtocolParameters;
  private readonly proposals: Map<ProposalId, GovernanceProposal> = new Map();
  private readonly votingPowers: Map<ParticipantId, VotingPower> = new Map();
  private readonly eventCallbacks: GAMPEventCallback[] = [];
  private paused = false;
  private counter = 0;

  constructor(config?: Partial<GovernanceLayerConfig>, initialParameters?: Partial<ProtocolParameters>) {
    this.config = { ...DEFAULT_GOVERNANCE_LAYER_CONFIG, ...config };
    this._parameters = { ...DEFAULT_PROTOCOL_PARAMETERS, ...initialParameters };
  }

  get parameters(): ProtocolParameters {
    return { ...this._parameters };
  }

  // ============================================================================
  // Voting Power
  // ============================================================================

  setVotingPower(participantId: ParticipantId, power: VotingPower): void {
    if (power < 0) {
      throw new Error('Voting power cannot be negative');
    }
    this.votingPowers.set(participantId, power);
  }

  getVotingPower(participantId: ParticipantId): VotingPower {
    return this.votingPowers.get(participantId) ?? 0;
  }

  getTotalVotingPower(): VotingPower {
    let total = 0;
    for (const power of this.votingPowers.values()) {
      total += power;
    }
    return total;
  }

  // ============================================================================
  // Proposals
  // ============================================================================

  submitProposal(params: SubmitProposalParams): GovernanceProposal {
    if (!this.config.daoEnabled) {
      throw new Error('DAO governance is currently disabled');
    }

    if (this.paused && params.type !== 'emergency_action') {
      throw new Error('Protocol is paused — only emergency actions are permitted');
    }

    const proposerPower = this.getVotingPower(params.proposerId);
    if (proposerPower === 0) {
      throw new Error(`Participant ${params.proposerId} has no voting power`);
    }

    const id = this.generateId('prop');
    const now = new Date();

    const votingDeadline = params.votingDeadline ?? new Date(
      now.getTime() + this.config.votingPeriodDays * 86_400_000
    );

    const proposal: GovernanceProposal = {
      id,
      title: params.title,
      description: params.description,
      type: params.type,
      proposerId: params.proposerId,
      status: 'voting',
      parameters: params.parameters,
      votingDeadline,
      executionDelay: params.executionDelay ?? this.config.executionDelayDays * 86_400_000,
      quorumRequired: this.config.quorumPercent,
      approvalThreshold: this.config.approvalThresholdPercent,
      yesVotes: 0,
      noVotes: 0,
      abstainVotes: 0,
      totalVotingPower: this.getTotalVotingPower(),
      votes: [],
      submittedAt: now,
    };

    this.proposals.set(id, proposal);

    this.emitEvent('governance_proposal_created', {
      proposalId: id,
      title: params.title,
      type: params.type,
      proposerId: params.proposerId,
    });

    return proposal;
  }

  cancelProposal(proposalId: ProposalId, reason?: string): GovernanceProposal {
    const proposal = this.requireProposal(proposalId);

    if (proposal.status === 'executed' || proposal.status === 'expired') {
      throw new Error(`Proposal ${proposalId} cannot be cancelled (status: ${proposal.status})`);
    }

    return this.updateProposal(proposalId, { status: 'cancelled' });
  }

  getProposal(proposalId: ProposalId): GovernanceProposal | undefined {
    return this.proposals.get(proposalId);
  }

  listProposals(filters?: ProposalFilters): GovernanceProposal[] {
    let result = Array.from(this.proposals.values());

    if (filters) {
      if (filters.status) result = result.filter(p => p.status === filters.status);
      if (filters.type) result = result.filter(p => p.type === filters.type);
      if (filters.proposerId) result = result.filter(p => p.proposerId === filters.proposerId);
    }

    return result;
  }

  // ============================================================================
  // Voting
  // ============================================================================

  castVote(params: CastVoteParams): Vote {
    const proposal = this.requireProposal(params.proposalId);

    if (proposal.status !== 'voting') {
      throw new Error(`Proposal ${params.proposalId} is not open for voting (status: ${proposal.status})`);
    }

    if (new Date() > proposal.votingDeadline) {
      throw new Error(`Voting deadline has passed for proposal ${params.proposalId}`);
    }

    if (this.hasVoted(params.proposalId, params.voterId)) {
      throw new Error(`Participant ${params.voterId} has already voted on proposal ${params.proposalId}`);
    }

    const votingPower = this.getVotingPower(params.voterId);
    if (votingPower === 0) {
      throw new Error(`Participant ${params.voterId} has no voting power`);
    }

    const vote: Vote = {
      proposalId: params.proposalId,
      voterId: params.voterId,
      decision: params.decision,
      votingPower,
      rationale: params.rationale,
      votedAt: new Date(),
    };

    const updatedProposal = this.requireProposal(params.proposalId);
    const updatedVotes = [...updatedProposal.votes, vote];
    const yesVotes = updatedProposal.yesVotes + (params.decision === 'yes' ? votingPower : 0);
    const noVotes = updatedProposal.noVotes + (params.decision === 'no' ? votingPower : 0);
    const abstainVotes = updatedProposal.abstainVotes + (params.decision === 'abstain' ? votingPower : 0);

    this.updateProposal(params.proposalId, { votes: updatedVotes, yesVotes, noVotes, abstainVotes });

    this.emitEvent('governance_vote_cast', {
      proposalId: params.proposalId,
      voterId: params.voterId,
      decision: params.decision,
      votingPower,
    });

    return vote;
  }

  hasVoted(proposalId: ProposalId, participantId: ParticipantId): boolean {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return false;
    return proposal.votes.some(v => v.voterId === participantId);
  }

  getVotes(proposalId: ProposalId): Vote[] {
    return this.proposals.get(proposalId)?.votes ?? [];
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  finalizeProposal(proposalId: ProposalId): GovernanceProposal {
    const proposal = this.requireProposal(proposalId);

    if (proposal.status !== 'voting') {
      throw new Error(`Proposal ${proposalId} is not in voting status`);
    }

    const totalPower = this.getTotalVotingPower();
    const totalVoted = proposal.yesVotes + proposal.noVotes + proposal.abstainVotes;
    const quorumReached = totalPower > 0 && (totalVoted / totalPower) * 100 >= proposal.quorumRequired;

    if (!quorumReached) {
      return this.updateProposal(proposalId, { status: 'rejected' });
    }

    const totalDecisive = proposal.yesVotes + proposal.noVotes;
    const approvalRate = totalDecisive > 0 ? (proposal.yesVotes / totalDecisive) * 100 : 0;
    const passed = approvalRate >= proposal.approvalThreshold;

    return this.updateProposal(proposalId, { status: passed ? 'passed' : 'rejected' });
  }

  executeProposal(proposalId: ProposalId): GovernanceProposal {
    const proposal = this.requireProposal(proposalId);

    if (proposal.status !== 'passed') {
      throw new Error(`Proposal ${proposalId} has not passed (status: ${proposal.status})`);
    }

    // Apply parameter changes
    if (proposal.type === 'parameter_change') {
      for (const [key, value] of Object.entries(proposal.parameters)) {
        if (key in this._parameters && typeof value === 'number') {
          this.updateParameter(key as keyof ProtocolParameters, value);
        }
      }
    }

    const executed = this.updateProposal(proposalId, {
      status: 'executed',
      executedAt: new Date(),
    });

    this.emitEvent('governance_proposal_executed', {
      proposalId,
      type: proposal.type,
      parameters: proposal.parameters,
    });

    return executed;
  }

  // ============================================================================
  // Parameters
  // ============================================================================

  getParameters(): ProtocolParameters {
    return { ...this._parameters };
  }

  updateParameter(key: keyof ProtocolParameters, value: number): void {
    if (!(key in this._parameters)) {
      throw new Error(`Unknown protocol parameter: ${key}`);
    }

    this._parameters = { ...this._parameters, [key]: value };
    this.emitEvent('parameter_updated', { key, value });
  }

  // ============================================================================
  // Emergency Actions
  // ============================================================================

  emergencyPause(reason: string): void {
    if (!this.config.emergencyActionsEnabled) {
      throw new Error('Emergency actions are disabled');
    }
    this.paused = true;
    this.emitEvent('risk_alert', { action: 'emergency_pause', reason });
  }

  emergencyUnpause(): void {
    if (!this.config.emergencyActionsEnabled) {
      throw new Error('Emergency actions are disabled');
    }
    this.paused = false;
    this.emitEvent('risk_alert', { action: 'emergency_unpause' });
  }

  isPaused(): boolean {
    return this.paused;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: GAMPEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${++this.counter}`;
  }

  private requireProposal(proposalId: ProposalId): GovernanceProposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }
    return proposal;
  }

  private updateProposal(proposalId: ProposalId, updates: Partial<GovernanceProposal>): GovernanceProposal {
    const proposal = this.requireProposal(proposalId);
    const updated: GovernanceProposal = { ...proposal, ...updates };
    this.proposals.set(proposalId, updated);
    return updated;
  }

  private emitEvent(type: GAMPEvent['type'], payload: Record<string, unknown>): void {
    const event: GAMPEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type,
      chain: 'ton',
      payload,
      timestamp: new Date(),
    };

    for (const cb of this.eventCallbacks) {
      try {
        cb(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGovernanceLayer(
  config?: Partial<GovernanceLayerConfig>,
  initialParameters?: Partial<ProtocolParameters>
): DefaultGovernanceLayer {
  return new DefaultGovernanceLayer(config, initialParameters);
}

export { DEFAULT_PROTOCOL_PARAMETERS };
export default DefaultGovernanceLayer;
