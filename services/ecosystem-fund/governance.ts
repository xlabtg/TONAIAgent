/**
 * TONAIAgent - Fund Governance
 *
 * DAO-based governance for the TON AI Ecosystem Fund.
 * Provides proposal creation, voting, committee management, and transparent decision-making.
 */

import {
  FundGovernanceConfig,
  FundProposal,
  FundProposalType,
  FundProposalStatus,
  AllocationCategory,
  FundVote,
  FundCommittee,
  CommitteeType,
  CommitteeMember,
  CommitteePermissions,
  CommitteeDecision,
  FundProposalRequest,
  VoteFundProposalRequest,
  EcosystemFundEvent,
  EcosystemFundEventCallback,
} from './types';

// ============================================================================
// Fund Governance Manager Interface
// ============================================================================

export interface FundGovernanceManager {
  readonly config: FundGovernanceConfig;

  // Proposal operations
  createProposal(request: FundProposalRequest, proposer: string): Promise<FundProposal>;
  getProposal(proposalId: string): Promise<FundProposal>;
  getProposals(filter?: ProposalFilter): Promise<FundProposal[]>;
  cancelProposal(proposalId: string, reason: string): Promise<FundProposal>;

  // Voting operations
  vote(request: VoteFundProposalRequest): Promise<FundVote>;
  getVotes(proposalId: string): Promise<FundVote[]>;
  getVotingPower(address: string): Promise<string>;
  hasVoted(proposalId: string, voter: string): Promise<boolean>;

  // Proposal lifecycle
  activateProposal(proposalId: string): Promise<FundProposal>;
  finalizeProposal(proposalId: string): Promise<FundProposal>;
  executeProposal(proposalId: string): Promise<ProposalExecutionResult>;

  // Committee operations
  createCommittee(
    name: string,
    type: CommitteeType,
    permissions: CommitteePermissions
  ): Promise<FundCommittee>;
  getCommittee(committeeId: string): Promise<FundCommittee>;
  getCommittees(): Promise<FundCommittee[]>;
  addCommitteeMember(
    committeeId: string,
    member: Omit<CommitteeMember, 'id' | 'joinedAt'>
  ): Promise<CommitteeMember>;
  removeCommitteeMember(committeeId: string, memberId: string): Promise<void>;
  recordCommitteeDecision(
    committeeId: string,
    decision: Omit<CommitteeDecision, 'id' | 'createdAt'>
  ): Promise<CommitteeDecision>;

  // Statistics
  getStats(): Promise<GovernanceStats>;

  // Testing helpers
  setProposalVotingDates(
    proposalId: string,
    votingStartsAt: Date,
    votingEndsAt: Date
  ): void;

  // Events
  onEvent(callback: EcosystemFundEventCallback): void;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface ProposalFilter {
  type?: FundProposalType;
  status?: FundProposalStatus;
  category?: AllocationCategory;
  proposer?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ProposalExecutionResult {
  success: boolean;
  proposalId: string;
  executedAt: Date;
  txHash?: string;
  result?: Record<string, unknown>;
  error?: string;
}

export interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  passedProposals: number;
  failedProposals: number;
  executedProposals: number;
  totalVotesCast: string;
  uniqueVoters: number;
  averageParticipation: number;
  committeeCount: number;
  committeeDecisions: number;
  totalFundsAllocated: string;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultFundGovernanceManager implements FundGovernanceManager {
  readonly config: FundGovernanceConfig;

  private proposals: Map<string, FundProposal> = new Map();
  private votes: Map<string, FundVote[]> = new Map();
  private committees: Map<string, FundCommittee> = new Map();
  private votingPower: Map<string, string> = new Map();
  private readonly eventCallbacks: EcosystemFundEventCallback[] = [];

  constructor(config: Partial<FundGovernanceConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      votingPeriod: config.votingPeriod ?? 7,
      executionDelay: config.executionDelay ?? 2,
      quorumPercent: config.quorumPercent ?? 10,
      supermajorityPercent: config.supermajorityPercent ?? 67,
      proposalThreshold: config.proposalThreshold ?? '10000',
      committeesEnabled: config.committeesEnabled ?? true,
      emergencyMultisig: config.emergencyMultisig ?? [],
    };
  }

  // ============================================================================
  // Proposal Operations
  // ============================================================================

  async createProposal(
    request: FundProposalRequest,
    proposer: string
  ): Promise<FundProposal> {
    // Validate proposer has enough voting power
    const power = await this.getVotingPower(proposer);
    if (BigInt(power) < BigInt(this.config.proposalThreshold)) {
      throw new Error(
        `Insufficient voting power. Required: ${this.config.proposalThreshold}, Have: ${power}`
      );
    }

    const now = new Date();
    const votingStartsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h delay
    const votingEndsAt = new Date(
      votingStartsAt.getTime() + this.config.votingPeriod * 24 * 60 * 60 * 1000
    );
    const executionDeadline = new Date(
      votingEndsAt.getTime() + this.config.executionDelay * 24 * 60 * 60 * 1000 + 7 * 24 * 60 * 60 * 1000
    );

    const proposal: FundProposal = {
      id: this.generateId('proposal'),
      type: request.type,
      title: request.title,
      description: request.description,
      proposer,
      category: request.category,
      amount: request.amount,
      recipient: request.recipient,
      terms: request.terms,
      status: 'pending',
      votes: {
        forVotes: '0',
        againstVotes: '0',
        abstainVotes: '0',
        totalVotes: '0',
        voterCount: 0,
        participation: 0,
      },
      votingStartsAt,
      votingEndsAt,
      executionDeadline,
      createdAt: now,
      metadata: {},
    };

    this.proposals.set(proposal.id, proposal);
    this.votes.set(proposal.id, []);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'proposal_created',
      category: 'governance',
      data: {
        proposalId: proposal.id,
        type: request.type,
        category: request.category,
        amount: request.amount,
      },
      actorId: proposer,
      relatedId: proposal.id,
    });

    return proposal;
  }

  async getProposal(proposalId: string): Promise<FundProposal> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }
    return { ...proposal };
  }

  async getProposals(filter?: ProposalFilter): Promise<FundProposal[]> {
    let proposals = Array.from(this.proposals.values());

    if (filter) {
      if (filter.type) {
        proposals = proposals.filter((p) => p.type === filter.type);
      }
      if (filter.status) {
        proposals = proposals.filter((p) => p.status === filter.status);
      }
      if (filter.category) {
        proposals = proposals.filter((p) => p.category === filter.category);
      }
      if (filter.proposer) {
        proposals = proposals.filter((p) => p.proposer === filter.proposer);
      }
      if (filter.fromDate) {
        proposals = proposals.filter((p) => p.createdAt >= filter.fromDate!);
      }
      if (filter.toDate) {
        proposals = proposals.filter((p) => p.createdAt <= filter.toDate!);
      }
      if (filter.offset) {
        proposals = proposals.slice(filter.offset);
      }
      if (filter.limit) {
        proposals = proposals.slice(0, filter.limit);
      }
    }

    return proposals;
  }

  async cancelProposal(proposalId: string, reason: string): Promise<FundProposal> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.status !== 'pending' && proposal.status !== 'active') {
      throw new Error(`Proposal cannot be cancelled in current status: ${proposal.status}`);
    }

    proposal.status = 'cancelled';
    proposal.cancelledAt = new Date();
    proposal.metadata.cancellationReason = reason;

    this.proposals.set(proposalId, proposal);

    return proposal;
  }

  // ============================================================================
  // Voting Operations
  // ============================================================================

  async vote(request: VoteFundProposalRequest): Promise<FundVote> {
    const proposal = this.proposals.get(request.proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${request.proposalId}`);
    }

    if (proposal.status !== 'active') {
      throw new Error(`Proposal is not active for voting: ${proposal.status}`);
    }

    const now = new Date();
    if (now < proposal.votingStartsAt || now > proposal.votingEndsAt) {
      throw new Error('Voting period is not active');
    }

    // Check if already voted
    if (await this.hasVoted(request.proposalId, request.voter)) {
      throw new Error('Already voted on this proposal');
    }

    // Get voting power
    const votingPower = request.votingPower ?? (await this.getVotingPower(request.voter));
    if (BigInt(votingPower) <= BigInt(0)) {
      throw new Error('No voting power');
    }

    const vote: FundVote = {
      id: this.generateId('vote'),
      proposalId: request.proposalId,
      voter: request.voter,
      support: request.support,
      votingPower,
      reason: request.reason,
      timestamp: now,
    };

    // Update vote counts
    const proposalVotes = this.votes.get(request.proposalId) ?? [];
    proposalVotes.push(vote);
    this.votes.set(request.proposalId, proposalVotes);

    // Update proposal vote tallies
    if (request.support === true) {
      proposal.votes.forVotes = (
        BigInt(proposal.votes.forVotes) + BigInt(votingPower)
      ).toString();
    } else if (request.support === false) {
      proposal.votes.againstVotes = (
        BigInt(proposal.votes.againstVotes) + BigInt(votingPower)
      ).toString();
    } else {
      proposal.votes.abstainVotes = (
        BigInt(proposal.votes.abstainVotes) + BigInt(votingPower)
      ).toString();
    }

    proposal.votes.totalVotes = (
      BigInt(proposal.votes.totalVotes) + BigInt(votingPower)
    ).toString();
    proposal.votes.voterCount++;

    // Calculate participation (simplified - would use total supply in production)
    const totalSupply = BigInt('1000000000'); // Example total supply
    proposal.votes.participation =
      Number((BigInt(proposal.votes.totalVotes) * BigInt(10000)) / totalSupply) / 100;

    this.proposals.set(request.proposalId, proposal);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'proposal_voted',
      category: 'governance',
      data: {
        proposalId: request.proposalId,
        voter: request.voter,
        support: request.support,
        votingPower,
      },
      actorId: request.voter,
      relatedId: request.proposalId,
    });

    return vote;
  }

  async getVotes(proposalId: string): Promise<FundVote[]> {
    return this.votes.get(proposalId) ?? [];
  }

  async getVotingPower(address: string): Promise<string> {
    // In production, this would query staking contracts
    return this.votingPower.get(address) ?? '0';
  }

  async hasVoted(proposalId: string, voter: string): Promise<boolean> {
    const proposalVotes = this.votes.get(proposalId) ?? [];
    return proposalVotes.some((v) => v.voter === voter);
  }

  // For testing/simulation
  setVotingPower(address: string, power: string): void {
    this.votingPower.set(address, power);
  }

  // ============================================================================
  // Proposal Lifecycle
  // ============================================================================

  async activateProposal(proposalId: string): Promise<FundProposal> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.status !== 'pending') {
      throw new Error(`Proposal cannot be activated in current status: ${proposal.status}`);
    }

    const now = new Date();
    if (now < proposal.votingStartsAt) {
      throw new Error('Voting period has not started');
    }

    proposal.status = 'active';
    this.proposals.set(proposalId, proposal);

    return proposal;
  }

  async finalizeProposal(proposalId: string): Promise<FundProposal> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.status !== 'active') {
      throw new Error(`Proposal cannot be finalized in current status: ${proposal.status}`);
    }

    const now = new Date();
    if (now < proposal.votingEndsAt) {
      throw new Error('Voting period has not ended');
    }

    // Check quorum
    const quorumReached = proposal.votes.participation >= this.config.quorumPercent;

    // Check if passed (supermajority of for vs against)
    const forVotes = BigInt(proposal.votes.forVotes);
    const againstVotes = BigInt(proposal.votes.againstVotes);
    const totalExcludingAbstain = forVotes + againstVotes;

    let passed = false;
    if (quorumReached && totalExcludingAbstain > BigInt(0)) {
      const forPercent = Number((forVotes * BigInt(100)) / totalExcludingAbstain);
      passed = forPercent >= this.config.supermajorityPercent;
    }

    proposal.status = passed ? 'passed' : 'failed';
    this.proposals.set(proposalId, proposal);

    return proposal;
  }

  async executeProposal(proposalId: string): Promise<ProposalExecutionResult> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.status !== 'passed' && proposal.status !== 'queued') {
      throw new Error(`Proposal cannot be executed in current status: ${proposal.status}`);
    }

    const now = new Date();
    const executionDelayMs = this.config.executionDelay * 24 * 60 * 60 * 1000;
    const earliestExecution = new Date(proposal.votingEndsAt.getTime() + executionDelayMs);

    if (now < earliestExecution) {
      throw new Error('Execution delay has not passed');
    }

    if (now > proposal.executionDeadline) {
      proposal.status = 'expired';
      this.proposals.set(proposalId, proposal);
      throw new Error('Proposal has expired');
    }

    // Execute the proposal (in production, this would interact with contracts)
    try {
      // Simulate execution based on proposal type
      const result = await this.executeProposalAction(proposal);

      proposal.status = 'executed';
      proposal.executedAt = now;
      this.proposals.set(proposalId, proposal);

      this.emitEvent({
        id: this.generateId('event'),
        timestamp: now,
        type: 'proposal_executed',
        category: 'governance',
        data: {
          proposalId,
          type: proposal.type,
          amount: proposal.amount,
        },
        relatedId: proposalId,
      });

      return {
        success: true,
        proposalId,
        executedAt: now,
        result,
      };
    } catch (error) {
      return {
        success: false,
        proposalId,
        executedAt: now,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async executeProposalAction(
    proposal: FundProposal
  ): Promise<Record<string, unknown>> {
    // Simulate different proposal type executions
    switch (proposal.type) {
      case 'grant_allocation':
      case 'investment_allocation':
      case 'incubation_allocation':
      case 'incentive_program':
        return {
          allocated: proposal.amount,
          recipient: proposal.recipient?.id,
          category: proposal.category,
        };
      case 'parameter_change':
        return {
          parameterChanged: true,
          newValue: proposal.metadata.newValue,
        };
      case 'committee_appointment':
        return {
          appointmentMade: true,
          member: proposal.metadata.member,
        };
      case 'emergency_action':
        return {
          emergencyExecuted: true,
          action: proposal.metadata.action,
        };
      default:
        return { executed: true };
    }
  }

  // ============================================================================
  // Committee Operations
  // ============================================================================

  async createCommittee(
    name: string,
    type: CommitteeType,
    permissions: CommitteePermissions
  ): Promise<FundCommittee> {
    const committee: FundCommittee = {
      id: this.generateId('committee'),
      name,
      type,
      members: [],
      permissions,
      budget: '0',
      spentBudget: '0',
      decisions: [],
      createdAt: new Date(),
    };

    this.committees.set(committee.id, committee);

    return committee;
  }

  async getCommittee(committeeId: string): Promise<FundCommittee> {
    const committee = this.committees.get(committeeId);
    if (!committee) {
      throw new Error(`Committee not found: ${committeeId}`);
    }
    return { ...committee };
  }

  async getCommittees(): Promise<FundCommittee[]> {
    return Array.from(this.committees.values());
  }

  async addCommitteeMember(
    committeeId: string,
    member: Omit<CommitteeMember, 'id' | 'joinedAt'>
  ): Promise<CommitteeMember> {
    const committee = this.committees.get(committeeId);
    if (!committee) {
      throw new Error(`Committee not found: ${committeeId}`);
    }

    const newMember: CommitteeMember = {
      ...member,
      id: this.generateId('member'),
      joinedAt: new Date(),
    };

    committee.members.push(newMember);
    this.committees.set(committeeId, committee);

    return newMember;
  }

  async removeCommitteeMember(committeeId: string, memberId: string): Promise<void> {
    const committee = this.committees.get(committeeId);
    if (!committee) {
      throw new Error(`Committee not found: ${committeeId}`);
    }

    const memberIndex = committee.members.findIndex((m) => m.id === memberId);
    if (memberIndex === -1) {
      throw new Error(`Member not found: ${memberId}`);
    }

    committee.members.splice(memberIndex, 1);
    this.committees.set(committeeId, committee);
  }

  async recordCommitteeDecision(
    committeeId: string,
    decision: Omit<CommitteeDecision, 'id' | 'createdAt'>
  ): Promise<CommitteeDecision> {
    const committee = this.committees.get(committeeId);
    if (!committee) {
      throw new Error(`Committee not found: ${committeeId}`);
    }

    const newDecision: CommitteeDecision = {
      ...decision,
      id: this.generateId('decision'),
      createdAt: new Date(),
    };

    committee.decisions.push(newDecision);

    // Update spent budget if applicable
    if (decision.amount && decision.outcome === 'approved') {
      committee.spentBudget = (
        BigInt(committee.spentBudget) + BigInt(decision.amount)
      ).toString();
    }

    this.committees.set(committeeId, committee);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'committee_decision',
      category: 'governance',
      data: {
        committeeId,
        decisionId: newDecision.id,
        type: decision.type,
        outcome: decision.outcome,
        amount: decision.amount,
      },
      relatedId: committeeId,
    });

    return newDecision;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  async getStats(): Promise<GovernanceStats> {
    const proposals = Array.from(this.proposals.values());
    const committees = Array.from(this.committees.values());

    const uniqueVoters = new Set<string>();
    let totalVotesCast = BigInt(0);

    for (const proposalVotes of this.votes.values()) {
      for (const vote of proposalVotes) {
        uniqueVoters.add(vote.voter);
        totalVotesCast += BigInt(vote.votingPower);
      }
    }

    const activeProposals = proposals.filter((p) => p.status === 'active').length;
    const passedProposals = proposals.filter((p) => p.status === 'passed' || p.status === 'executed').length;
    const failedProposals = proposals.filter((p) => p.status === 'failed').length;
    const executedProposals = proposals.filter((p) => p.status === 'executed').length;

    const totalParticipation = proposals.reduce((sum, p) => sum + p.votes.participation, 0);
    const averageParticipation = proposals.length > 0 ? totalParticipation / proposals.length : 0;

    const committeeDecisions = committees.reduce(
      (sum, c) => sum + c.decisions.length,
      0
    );

    const totalFundsAllocated = proposals
      .filter((p) => p.status === 'executed')
      .reduce((sum, p) => sum + BigInt(p.amount), BigInt(0));

    return {
      totalProposals: proposals.length,
      activeProposals,
      passedProposals,
      failedProposals,
      executedProposals,
      totalVotesCast: totalVotesCast.toString(),
      uniqueVoters: uniqueVoters.size,
      averageParticipation,
      committeeCount: committees.length,
      committeeDecisions,
      totalFundsAllocated: totalFundsAllocated.toString(),
    };
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: EcosystemFundEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: EcosystemFundEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // ============================================================================
  // Testing Helpers
  // ============================================================================

  /**
   * Set voting dates for a proposal (for testing purposes only)
   */
  setProposalVotingDates(
    proposalId: string,
    votingStartsAt: Date,
    votingEndsAt: Date
  ): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }
    proposal.votingStartsAt = votingStartsAt;
    proposal.votingEndsAt = votingEndsAt;
    this.proposals.set(proposalId, proposal);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createFundGovernanceManager(
  config?: Partial<FundGovernanceConfig>
): DefaultFundGovernanceManager {
  return new DefaultFundGovernanceManager(config);
}
