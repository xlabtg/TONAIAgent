/**
 * TONAIAgent - DAO Governance Engine (Issue #103)
 *
 * Core governance engine for the DAO. Handles proposal lifecycle,
 * voting mechanics, delegation, and timelock execution.
 */

import type {
  DaoProposal,
  DaoProposalType,
  DaoProposalStatus,
  DaoVote,
  DaoVoteType,
  DaoVoteResult,
  CreateDaoProposalInput,
  VotingDelegation,
  VotingPowerSnapshot,
  CreateDelegationInput,
  DaoEvent,
  DaoEventCallback,
  DaoGovernanceConfig,
  ProposalTypeConfig,
  GovernanceActivitySummary,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface GovernanceEngine {
  // Proposal management
  createProposal(input: CreateDaoProposalInput): Promise<DaoProposal>;
  getProposal(proposalId: string): Promise<DaoProposal | undefined>;
  getActiveProposals(): Promise<DaoProposal[]>;
  getProposalsByType(type: DaoProposalType): Promise<DaoProposal[]>;
  getProposalHistory(limit?: number): Promise<DaoProposal[]>;
  cancelProposal(proposalId: string, canceller: string): Promise<boolean>;

  // Voting
  castVote(proposalId: string, voter: string, voteType: DaoVoteType, reason?: string): Promise<DaoVoteResult>;
  getVotes(proposalId: string): Promise<DaoVote[]>;
  getVotingPower(address: string, snapshotBlock?: number): Promise<number>;
  setVotingPower(address: string, power: number): void;

  // Delegation
  createDelegation(input: CreateDelegationInput): Promise<VotingDelegation>;
  revokeDelegation(delegationId: string, delegator: string): Promise<boolean>;
  getDelegations(address: string): Promise<VotingDelegation[]>;
  getDelegationByDelegator(delegator: string): Promise<VotingDelegation[]>;

  // Timelock & execution
  queueProposal(proposalId: string): Promise<boolean>;
  executeProposal(proposalId: string): Promise<{ success: boolean; results: unknown[] }>;

  // Analytics
  getActivitySummary(since: Date): GovernanceActivitySummary;

  // State management
  tickProposals(): void;

  // Events
  onEvent(callback: DaoEventCallback): () => void;
}

// ============================================================================
// Configuration & Defaults
// ============================================================================

export interface GovernanceEngineConfig {
  votingDelay: number;
  votingPeriod: number;
  proposalThreshold: number;
  quorumPercent: number;
  approvalThreshold: number;
  timelockDuration: number;
  proposalTypeConfigs?: Partial<Record<DaoProposalType, ProposalTypeConfig>>;
}

const DEFAULT_PROPOSAL_TYPE_CONFIGS: Record<DaoProposalType, ProposalTypeConfig> = {
  strategy_approval: {
    quorumPercent: 10,
    approvalThreshold: 51,
    timelockDuration: 86400,       // 1 day
    votingPeriod: 302400,          // ~5 days in blocks
    requiresMultiSig: false,
  },
  treasury_allocation: {
    quorumPercent: 15,
    approvalThreshold: 60,
    timelockDuration: 172800,      // 2 days
    votingPeriod: 302400,
    requiresMultiSig: true,
  },
  risk_parameter_change: {
    quorumPercent: 20,
    approvalThreshold: 66,
    timelockDuration: 259200,      // 3 days
    votingPeriod: 403200,          // ~7 days
    requiresMultiSig: true,
  },
  marketplace_curation: {
    quorumPercent: 5,
    approvalThreshold: 51,
    timelockDuration: 43200,       // 12 hours
    votingPeriod: 201600,          // ~3.5 days
    requiresMultiSig: false,
  },
  protocol_upgrade: {
    quorumPercent: 25,
    approvalThreshold: 75,
    timelockDuration: 604800,      // 7 days
    votingPeriod: 604800,
    requiresMultiSig: true,
  },
  emergency_action: {
    quorumPercent: 10,
    approvalThreshold: 66,
    timelockDuration: 0,           // No timelock for emergency
    votingPeriod: 14400,           // ~6 hours
    requiresMultiSig: true,
  },
  fee_change: {
    quorumPercent: 10,
    approvalThreshold: 51,
    timelockDuration: 172800,
    votingPeriod: 302400,
    requiresMultiSig: false,
  },
  agent_whitelist: {
    quorumPercent: 10,
    approvalThreshold: 51,
    timelockDuration: 86400,
    votingPeriod: 201600,
    requiresMultiSig: false,
  },
  governance_parameter: {
    quorumPercent: 20,
    approvalThreshold: 66,
    timelockDuration: 259200,
    votingPeriod: 403200,
    requiresMultiSig: true,
  },
};

const DEFAULT_CONFIG: GovernanceEngineConfig = {
  votingDelay: 13140,          // ~2 days in blocks
  votingPeriod: 302400,        // ~5 days in blocks
  proposalThreshold: 100,      // 100 tokens to create proposal
  quorumPercent: 10,           // 10% participation required
  approvalThreshold: 51,       // 51% approval required
  timelockDuration: 172800,    // 2 days timelock
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultGovernanceEngine implements GovernanceEngine {
  private readonly config: GovernanceEngineConfig;
  private readonly proposals = new Map<string, DaoProposal>();
  private readonly votes = new Map<string, DaoVote[]>();              // proposalId -> votes
  private readonly voterRecord = new Map<string, Set<string>>();     // proposalId -> voter addresses
  private readonly delegations = new Map<string, VotingDelegation>();
  private readonly votingPowers = new Map<string, number>();
  private readonly eventCallbacks: DaoEventCallback[] = [];
  private blockCounter = 1000000;

  constructor(config: Partial<GovernanceEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // --------------------------------------------------------------------------
  // Proposal Management
  // --------------------------------------------------------------------------

  async createProposal(input: CreateDaoProposalInput): Promise<DaoProposal> {
    const proposerPower = await this.getVotingPower(input.proposer);
    if (proposerPower < this.config.proposalThreshold) {
      throw new Error(
        `Insufficient voting power: ${proposerPower} < ${this.config.proposalThreshold} required`
      );
    }

    const typeConfig = this.getTypeConfig(input.type);
    const now = new Date();
    const blockTime = 5; // seconds per block approximation
    const delayMs = this.config.votingDelay * blockTime * 1000;
    const periodMs = typeConfig.votingPeriod * blockTime * 1000;

    const proposal: DaoProposal = {
      id: this.generateId(),
      type: input.type,
      title: input.title,
      description: input.description,
      actions: input.actions,
      proposer: input.proposer,
      status: 'pending',
      snapshotBlock: this.blockCounter,
      votingStartsAt: new Date(now.getTime() + delayMs),
      votingEndsAt: new Date(now.getTime() + delayMs + periodMs),
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
      totalVotingPower: this.getTotalVotingPower(),
      quorum: typeConfig.quorumPercent,
      threshold: typeConfig.approvalThreshold,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata,
    };

    this.proposals.set(proposal.id, proposal);
    this.votes.set(proposal.id, []);
    this.voterRecord.set(proposal.id, new Set());

    this.emit({ type: 'proposal.created', data: { proposal }, timestamp: now });

    return proposal;
  }

  async getProposal(proposalId: string): Promise<DaoProposal | undefined> {
    const proposal = this.proposals.get(proposalId);
    if (proposal) {
      this.syncProposalStatus(proposal);
    }
    return proposal;
  }

  async getActiveProposals(): Promise<DaoProposal[]> {
    const proposals: DaoProposal[] = [];
    for (const proposal of this.proposals.values()) {
      this.syncProposalStatus(proposal);
      if (proposal.status === 'active' || proposal.status === 'pending') {
        proposals.push(proposal);
      }
    }
    return proposals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getProposalsByType(type: DaoProposalType): Promise<DaoProposal[]> {
    const proposals: DaoProposal[] = [];
    for (const proposal of this.proposals.values()) {
      if (proposal.type === type) {
        proposals.push(proposal);
      }
    }
    return proposals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getProposalHistory(limit = 50): Promise<DaoProposal[]> {
    const all = Array.from(this.proposals.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return all.slice(0, limit);
  }

  async cancelProposal(proposalId: string, canceller: string): Promise<boolean> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return false;
    if (proposal.status !== 'pending' && proposal.status !== 'active') return false;
    if (proposal.proposer !== canceller) return false;

    proposal.status = 'cancelled';
    proposal.cancelledAt = new Date();
    proposal.updatedAt = new Date();

    this.emit({ type: 'proposal.cancelled', data: { proposalId, canceller }, timestamp: new Date() });
    return true;
  }

  // --------------------------------------------------------------------------
  // Voting
  // --------------------------------------------------------------------------

  async castVote(
    proposalId: string,
    voter: string,
    voteType: DaoVoteType,
    reason?: string
  ): Promise<DaoVoteResult> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

    this.syncProposalStatus(proposal);
    if (proposal.status !== 'active') {
      throw new Error(`Proposal ${proposalId} is not active (status: ${proposal.status})`);
    }

    const voterSet = this.voterRecord.get(proposalId)!;
    if (voterSet.has(voter)) {
      throw new Error(`Address ${voter} has already voted on proposal ${proposalId}`);
    }

    const votingPower = await this.getVotingPower(voter, proposal.snapshotBlock);
    if (votingPower === 0) {
      throw new Error(`Address ${voter} has no voting power`);
    }

    const vote: DaoVote = {
      proposalId,
      voter,
      voteType,
      votingPower,
      reason,
      timestamp: new Date(),
    };

    const proposalVotes = this.votes.get(proposalId)!;
    proposalVotes.push(vote);
    voterSet.add(voter);

    if (voteType === 'for') proposal.forVotes += votingPower;
    else if (voteType === 'against') proposal.againstVotes += votingPower;
    else proposal.abstainVotes += votingPower;

    proposal.updatedAt = new Date();

    this.emit({
      type: 'proposal.voted',
      data: { proposalId, voter, voteType, votingPower },
      timestamp: new Date(),
    });

    // Check if proposal has concluded early (enough votes)
    this.checkProposalConclusion(proposal);

    return {
      success: true,
      proposalId,
      voter,
      voteType,
      votingPower,
      newForVotes: proposal.forVotes,
      newAgainstVotes: proposal.againstVotes,
      newAbstainVotes: proposal.abstainVotes,
    };
  }

  async getVotes(proposalId: string): Promise<DaoVote[]> {
    return this.votes.get(proposalId) ?? [];
  }

  async getVotingPower(address: string, _snapshotBlock?: number): Promise<number> {
    const direct = this.votingPowers.get(address) ?? 0;
    let delegated = 0;

    // Add delegated power from active delegations
    for (const delegation of this.delegations.values()) {
      if (delegation.delegatee === address && delegation.active) {
        if (!delegation.expiresAt || delegation.expiresAt > new Date()) {
          delegated += delegation.power;
        }
      }
    }

    return direct + delegated;
  }

  setVotingPower(address: string, power: number): void {
    this.votingPowers.set(address, power);
  }

  // --------------------------------------------------------------------------
  // Delegation
  // --------------------------------------------------------------------------

  async createDelegation(input: CreateDelegationInput): Promise<VotingDelegation> {
    const delegatorPower = this.votingPowers.get(input.delegator) ?? 0;
    if (input.power > delegatorPower) {
      throw new Error(
        `Cannot delegate ${input.power} power — delegator only has ${delegatorPower}`
      );
    }

    // Check for existing active delegation from this delegator
    const existing = Array.from(this.delegations.values()).find(
      d => d.delegator === input.delegator && d.active
    );
    if (existing) {
      // Revoke existing first
      existing.active = false;
      existing.revokedAt = new Date();
    }

    const delegation: VotingDelegation = {
      id: this.generateId(),
      delegator: input.delegator,
      delegatee: input.delegatee,
      power: input.power,
      proposalTypes: input.proposalTypes,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
      active: true,
    };

    this.delegations.set(delegation.id, delegation);
    this.emit({ type: 'delegation.created', data: { delegation }, timestamp: new Date() });

    return delegation;
  }

  async revokeDelegation(delegationId: string, delegator: string): Promise<boolean> {
    const delegation = this.delegations.get(delegationId);
    if (!delegation) return false;
    if (delegation.delegator !== delegator) return false;
    if (!delegation.active) return false;

    delegation.active = false;
    delegation.revokedAt = new Date();

    this.emit({ type: 'delegation.revoked', data: { delegationId, delegator }, timestamp: new Date() });
    return true;
  }

  async getDelegations(address: string): Promise<VotingDelegation[]> {
    const result: VotingDelegation[] = [];
    for (const d of this.delegations.values()) {
      if (d.delegatee === address || d.delegator === address) {
        result.push(d);
      }
    }
    return result;
  }

  async getDelegationByDelegator(delegator: string): Promise<VotingDelegation[]> {
    const result: VotingDelegation[] = [];
    for (const d of this.delegations.values()) {
      if (d.delegator === delegator) result.push(d);
    }
    return result;
  }

  // --------------------------------------------------------------------------
  // Timelock & Execution
  // --------------------------------------------------------------------------

  async queueProposal(proposalId: string): Promise<boolean> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return false;

    this.syncProposalStatus(proposal);
    if (proposal.status !== 'succeeded') return false;

    const typeConfig = this.getTypeConfig(proposal.type);
    const eta = new Date(Date.now() + typeConfig.timelockDuration * 1000);

    proposal.status = 'queued';
    proposal.executionEta = eta;
    proposal.updatedAt = new Date();

    this.emit({ type: 'proposal.queued', data: { proposalId, eta }, timestamp: new Date() });
    return true;
  }

  async executeProposal(proposalId: string): Promise<{ success: boolean; results: unknown[] }> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return { success: false, results: [] };
    if (proposal.status !== 'queued') return { success: false, results: [] };
    if (proposal.executionEta && proposal.executionEta > new Date()) {
      return { success: false, results: [] };
    }

    // Simulate action execution
    const results = proposal.actions.map(action => ({
      target: action.target,
      success: true,
      description: action.description,
    }));

    proposal.status = 'executed';
    proposal.executedAt = new Date();
    proposal.updatedAt = new Date();

    this.emit({ type: 'proposal.executed', data: { proposalId, results }, timestamp: new Date() });

    return { success: true, results };
  }

  // --------------------------------------------------------------------------
  // Analytics
  // --------------------------------------------------------------------------

  getActivitySummary(since: Date): GovernanceActivitySummary {
    let proposalsCreated = 0;
    let proposalsPassed = 0;
    let proposalsDefeated = 0;
    let proposalsExecuted = 0;
    let totalVotesCast = 0;
    const uniqueVoters = new Set<string>();
    const participationRates: number[] = [];

    for (const proposal of this.proposals.values()) {
      if (proposal.createdAt < since) continue;
      proposalsCreated++;
      if (proposal.status === 'succeeded' || proposal.status === 'queued') proposalsPassed++;
      if (proposal.status === 'defeated') proposalsDefeated++;
      if (proposal.status === 'executed') proposalsExecuted++;

      const proposalVotes = this.votes.get(proposal.id) ?? [];
      totalVotesCast += proposalVotes.length;
      for (const v of proposalVotes) uniqueVoters.add(v.voter);

      if (proposal.totalVotingPower > 0) {
        const participated = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
        participationRates.push(participated / proposal.totalVotingPower);
      }
    }

    const avgParticipation = participationRates.length > 0
      ? participationRates.reduce((a, b) => a + b, 0) / participationRates.length
      : 0;

    return {
      proposalsCreated,
      proposalsPassed,
      proposalsDefeated,
      proposalsExecuted,
      totalVotesCast,
      uniqueVoters: uniqueVoters.size,
      averageParticipationRate: avgParticipation,
    };
  }

  // --------------------------------------------------------------------------
  // Tick (simulate time passage for proposal state transitions)
  // --------------------------------------------------------------------------

  tickProposals(): void {
    this.blockCounter += 100;
    for (const proposal of this.proposals.values()) {
      this.syncProposalStatus(proposal);
    }
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  onEvent(callback: DaoEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private syncProposalStatus(proposal: DaoProposal): void {
    const now = new Date();

    if (proposal.status === 'pending' && now >= proposal.votingStartsAt) {
      proposal.status = 'active';
      proposal.updatedAt = now;
    }

    if (proposal.status === 'active' && now >= proposal.votingEndsAt) {
      const concluded = this.computeProposalOutcome(proposal);
      proposal.status = concluded;
      proposal.updatedAt = now;

      const eventType = concluded === 'succeeded' ? 'proposal.succeeded' : 'proposal.defeated';
      this.emit({ type: eventType, data: { proposalId: proposal.id }, timestamp: now });
    }

    if (proposal.status === 'queued' && proposal.executionEta) {
      const timelockDuration = this.getTypeConfig(proposal.type).timelockDuration;
      const expiry = new Date(proposal.executionEta.getTime() + timelockDuration * 2 * 1000);
      if (now > expiry) {
        proposal.status = 'expired';
        proposal.updatedAt = now;
      }
    }
  }

  private checkProposalConclusion(proposal: DaoProposal): void {
    const totalCast = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
    const quorumRequired = (proposal.totalVotingPower * proposal.quorum) / 100;

    // If quorum is met and threshold crossed, can conclude early
    if (totalCast >= quorumRequired) {
      const forPercent = totalCast > 0 ? (proposal.forVotes / totalCast) * 100 : 0;
      if (forPercent >= proposal.threshold) {
        // Early success possible — let the normal sync handle it at period end
        // But we don't force early conclusion to respect voting period
      }
    }
  }

  private computeProposalOutcome(proposal: DaoProposal): 'succeeded' | 'defeated' {
    const totalCast = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
    const quorumRequired = (proposal.totalVotingPower * proposal.quorum) / 100;

    if (totalCast < quorumRequired) return 'defeated';

    const forPercent = totalCast > 0 ? (proposal.forVotes / totalCast) * 100 : 0;
    return forPercent >= proposal.threshold ? 'succeeded' : 'defeated';
  }

  private getTotalVotingPower(): number {
    let total = 0;
    for (const power of this.votingPowers.values()) {
      total += power;
    }
    return total || 1000; // fallback for tests
  }

  private getTypeConfig(type: DaoProposalType): ProposalTypeConfig {
    const overrides = this.config.proposalTypeConfigs ?? {};
    return { ...DEFAULT_PROPOSAL_TYPE_CONFIGS[type], ...(overrides[type] ?? {}) };
  }

  private emit(event: DaoEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function createGovernanceEngine(config?: Partial<GovernanceEngineConfig>): DefaultGovernanceEngine {
  return new DefaultGovernanceEngine(config);
}
