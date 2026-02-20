/**
 * TONAIAgent - Governance Framework
 *
 * Implements DAO governance with proposals, voting, delegation,
 * and execution mechanisms.
 */

import {
  GovernanceConfig,
  ProposalRequest,
  Proposal,
  ProposalType,
  ProposalStatus,
  ProposalCategory,
  ProposalAction,
  VoteRequest,
  Vote,
  DelegationRequest,
  Delegation,
  GovernanceStats,
  VotingPowerResult,
  TokenomicsEvent,
  TokenomicsEventCallback,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_GOVERNANCE_CONFIG: GovernanceConfig = {
  enabled: true,
  proposalThreshold: '10000000000000', // 10,000 tokens with 9 decimals
  votingPeriod: 7, // days
  executionDelay: 2, // days
  quorumPercent: 10,
  supermajorityPercent: 67,
  gracePeriod: 3, // days
  maxActionsPerProposal: 10,
  delegationEnabled: true,
};

// Proposal type configurations
const PROPOSAL_TYPE_CONFIG: Record<ProposalType, { quorum: number; threshold: number; delay: number }> = {
  parameter_change: { quorum: 10, threshold: 50, delay: 2 },
  treasury_spend: { quorum: 15, threshold: 60, delay: 3 },
  protocol_upgrade: { quorum: 20, threshold: 67, delay: 7 },
  emergency: { quorum: 5, threshold: 75, delay: 0 },
  grant: { quorum: 10, threshold: 50, delay: 2 },
  text: { quorum: 5, threshold: 50, delay: 0 },
};

// ============================================================================
// Interfaces
// ============================================================================

export interface GovernanceEngine {
  readonly config: GovernanceConfig;

  // Proposals
  createProposal(request: ProposalRequest): Promise<Proposal>;
  getProposal(proposalId: string): Promise<Proposal | null>;
  listProposals(filter?: ProposalFilter): Promise<Proposal[]>;
  cancelProposal(proposalId: string, cancellerId: string): Promise<boolean>;

  // Voting
  vote(request: VoteRequest): Promise<Vote>;
  getVote(proposalId: string, voter: string): Promise<Vote | null>;
  getProposalVotes(proposalId: string): Promise<Vote[]>;

  // Delegation
  delegate(request: DelegationRequest): Promise<Delegation>;
  revokeDelegation(delegator: string, delegatee: string): Promise<boolean>;
  getDelegations(userId: string): Promise<DelegationInfo>;

  // Execution
  queueProposal(proposalId: string): Promise<boolean>;
  executeProposal(proposalId: string): Promise<ProposalExecutionResult>;

  // Voting power
  calculateVotingPower(userId: string, stakedAmount?: string): Promise<VotingPowerResult>;
  getTotalVotingPower(): Promise<string>;

  // Statistics
  getStats(): Promise<GovernanceStats>;
  getParameters(): GovernanceConfig;

  // Events
  onEvent(callback: TokenomicsEventCallback): void;
}

export interface ProposalFilter {
  status?: ProposalStatus[];
  type?: ProposalType[];
  category?: ProposalCategory[];
  proposer?: string;
  limit?: number;
  offset?: number;
}

export interface DelegationInfo {
  delegatedTo: Delegation[];
  receivedFrom: Delegation[];
  totalDelegatedPower: string;
  totalReceivedPower: string;
}

export interface ProposalExecutionResult {
  success: boolean;
  proposalId: string;
  executedActions: ActionResult[];
  timestamp: Date;
  error?: string;
}

export interface ActionResult {
  index: number;
  action: ProposalAction;
  success: boolean;
  result?: unknown;
  error?: string;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultGovernanceEngine implements GovernanceEngine {
  readonly config: GovernanceConfig;

  // Storage
  private readonly proposals: Map<string, Proposal> = new Map();
  private readonly votes: Map<string, Map<string, Vote>> = new Map(); // proposalId -> voterId -> Vote
  private readonly delegations: Map<string, Delegation[]> = new Map(); // delegator -> delegations
  private readonly receivedDelegations: Map<string, Delegation[]> = new Map(); // delegatee -> delegations
  private readonly userVotingPower: Map<string, string> = new Map();

  private readonly eventCallbacks: TokenomicsEventCallback[] = [];

  // Statistics
  private stats: GovernanceStats = {
    totalProposals: 0,
    passedProposals: 0,
    failedProposals: 0,
    activeProposals: 0,
    totalVotesCast: '0',
    uniqueVoters: 0,
    averageParticipation: 0,
    treasuryBalance: '0',
  };

  constructor(config: Partial<GovernanceConfig> = {}) {
    this.config = { ...DEFAULT_GOVERNANCE_CONFIG, ...config };
  }

  // --------------------------------------------------------------------------
  // Proposals
  // --------------------------------------------------------------------------

  async createProposal(request: ProposalRequest): Promise<Proposal> {
    // Validate proposer has enough voting power
    const votingPower = await this.calculateVotingPower(request.proposer);
    if (BigInt(votingPower.votingPower) < BigInt(this.config.proposalThreshold)) {
      throw new Error(`Insufficient voting power. Required: ${this.config.proposalThreshold}, Have: ${votingPower.votingPower}`);
    }

    // Validate actions
    if (request.actions && request.actions.length > this.config.maxActionsPerProposal) {
      throw new Error(`Too many actions. Maximum: ${this.config.maxActionsPerProposal}`);
    }

    const now = new Date();
    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Get type-specific configuration
    const typeConfig = PROPOSAL_TYPE_CONFIG[request.type];

    // Calculate dates
    const votingStartsAt = now;
    const votingEndsAt = new Date(now.getTime() + this.config.votingPeriod * 24 * 60 * 60 * 1000);
    const executionDeadline = new Date(votingEndsAt.getTime() + (typeConfig.delay + this.config.gracePeriod) * 24 * 60 * 60 * 1000);

    const proposal: Proposal = {
      id: proposalId,
      proposer: request.proposer,
      title: request.title,
      description: request.description,
      type: request.type,
      category: request.category,
      status: 'active',
      parameters: request.parameters,
      actions: request.actions ?? [],
      discussionUrl: request.discussionUrl,
      votingStartsAt,
      votingEndsAt,
      executionDeadline,
      votes: {
        forVotes: '0',
        againstVotes: '0',
        abstainVotes: '0',
        totalVotes: '0',
        voterCount: 0,
        participation: 0,
      },
      quorumReached: false,
      passed: false,
      createdAt: now,
    };

    // Store proposal
    this.proposals.set(proposalId, proposal);
    this.votes.set(proposalId, new Map());

    // Update stats
    this.stats.totalProposals++;
    this.stats.activeProposals++;

    // Emit event
    this.emitEvent({
      type: 'proposal_created',
      category: 'governance',
      data: {
        proposalId,
        proposer: request.proposer,
        title: request.title,
        type: request.type,
        votingEndsAt: votingEndsAt.toISOString(),
      },
      userId: request.proposer,
    });

    return proposal;
  }

  async getProposal(proposalId: string): Promise<Proposal | null> {
    const proposal = this.proposals.get(proposalId);
    if (proposal) {
      // Update status based on time
      this.updateProposalStatus(proposal);
    }
    return proposal ?? null;
  }

  async listProposals(filter?: ProposalFilter): Promise<Proposal[]> {
    let proposals = Array.from(this.proposals.values());

    // Update all statuses
    for (const proposal of proposals) {
      this.updateProposalStatus(proposal);
    }

    // Apply filters
    if (filter?.status) {
      proposals = proposals.filter(p => filter.status!.includes(p.status));
    }
    if (filter?.type) {
      proposals = proposals.filter(p => filter.type!.includes(p.type));
    }
    if (filter?.category) {
      proposals = proposals.filter(p => filter.category!.includes(p.category));
    }
    if (filter?.proposer) {
      proposals = proposals.filter(p => p.proposer === filter.proposer);
    }

    // Sort by creation date (newest first)
    proposals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    if (filter?.offset) {
      proposals = proposals.slice(filter.offset);
    }
    if (filter?.limit) {
      proposals = proposals.slice(0, filter.limit);
    }

    return proposals;
  }

  async cancelProposal(proposalId: string, cancellerId: string): Promise<boolean> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      return false;
    }

    // Only proposer can cancel
    if (proposal.proposer !== cancellerId) {
      throw new Error('Only the proposer can cancel a proposal');
    }

    // Can only cancel pending or active proposals
    if (proposal.status !== 'pending' && proposal.status !== 'active') {
      throw new Error('Cannot cancel proposal in current status');
    }

    proposal.status = 'cancelled';
    proposal.cancelledAt = new Date();

    this.stats.activeProposals--;

    return true;
  }

  private updateProposalStatus(proposal: Proposal): void {
    const now = new Date();

    if (proposal.status === 'active' && now > proposal.votingEndsAt) {
      // Voting ended - determine outcome
      const typeConfig = PROPOSAL_TYPE_CONFIG[proposal.type];
      const totalVotingPower = this.getTotalVotingPowerSync();

      // Check quorum
      const participationPercent = (Number(BigInt(proposal.votes.totalVotes) * BigInt(100) / BigInt(totalVotingPower || '1')));
      proposal.votes.participation = participationPercent;
      proposal.quorumReached = participationPercent >= typeConfig.quorum;

      // Check if passed
      if (proposal.quorumReached) {
        const forPercent = Number(BigInt(proposal.votes.forVotes) * BigInt(100) / BigInt(proposal.votes.totalVotes || '1'));
        proposal.passed = forPercent >= typeConfig.threshold;
      }

      // Update status
      if (proposal.passed) {
        proposal.status = 'passed';
        this.stats.passedProposals++;
      } else {
        proposal.status = 'failed';
        this.stats.failedProposals++;
      }
      this.stats.activeProposals--;
    }

    // Check for expiration
    if (proposal.status === 'passed' && now > proposal.executionDeadline) {
      proposal.status = 'expired';
    }
  }

  // --------------------------------------------------------------------------
  // Voting
  // --------------------------------------------------------------------------

  async vote(request: VoteRequest): Promise<Vote> {
    const proposal = await this.getProposal(request.proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.status !== 'active') {
      throw new Error('Voting is not active for this proposal');
    }

    // Check if already voted
    const existingVote = await this.getVote(request.proposalId, request.voter);
    if (existingVote) {
      throw new Error('Already voted on this proposal');
    }

    // Calculate voting power
    const votingPower = request.votingPower
      ? request.votingPower
      : (await this.calculateVotingPower(request.voter)).votingPower;

    const voteId = `vote_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const vote: Vote = {
      id: voteId,
      proposalId: request.proposalId,
      voter: request.voter,
      support: request.support,
      votingPower,
      reason: request.reason,
      timestamp: new Date(),
    };

    // Store vote
    this.votes.get(request.proposalId)!.set(request.voter, vote);

    // Update proposal vote counts
    const power = BigInt(votingPower);
    if (request.support === true) {
      proposal.votes.forVotes = (BigInt(proposal.votes.forVotes) + power).toString();
    } else if (request.support === false) {
      proposal.votes.againstVotes = (BigInt(proposal.votes.againstVotes) + power).toString();
    } else {
      proposal.votes.abstainVotes = (BigInt(proposal.votes.abstainVotes) + power).toString();
    }
    proposal.votes.totalVotes = (BigInt(proposal.votes.totalVotes) + power).toString();
    proposal.votes.voterCount++;

    // Update stats
    this.stats.totalVotesCast = (BigInt(this.stats.totalVotesCast) + power).toString();

    // Emit event
    this.emitEvent({
      type: 'vote_cast',
      category: 'governance',
      data: {
        proposalId: request.proposalId,
        voter: request.voter,
        support: request.support,
        votingPower,
      },
      userId: request.voter,
    });

    return vote;
  }

  async getVote(proposalId: string, voter: string): Promise<Vote | null> {
    return this.votes.get(proposalId)?.get(voter) ?? null;
  }

  async getProposalVotes(proposalId: string): Promise<Vote[]> {
    const proposalVotes = this.votes.get(proposalId);
    if (!proposalVotes) {
      return [];
    }
    return Array.from(proposalVotes.values());
  }

  // --------------------------------------------------------------------------
  // Delegation
  // --------------------------------------------------------------------------

  async delegate(request: DelegationRequest): Promise<Delegation> {
    if (!this.config.delegationEnabled) {
      throw new Error('Delegation is not enabled');
    }

    // Cannot delegate to self
    if (request.delegator === request.delegatee) {
      throw new Error('Cannot delegate to self');
    }

    const delegationId = `del_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const delegation: Delegation = {
      id: delegationId,
      delegator: request.delegator,
      delegatee: request.delegatee,
      amount: request.amount,
      createdAt: new Date(),
    };

    // Store delegation
    if (!this.delegations.has(request.delegator)) {
      this.delegations.set(request.delegator, []);
    }
    this.delegations.get(request.delegator)!.push(delegation);

    if (!this.receivedDelegations.has(request.delegatee)) {
      this.receivedDelegations.set(request.delegatee, []);
    }
    this.receivedDelegations.get(request.delegatee)!.push(delegation);

    // Emit event
    this.emitEvent({
      type: 'delegation_created',
      category: 'governance',
      data: {
        delegationId,
        delegator: request.delegator,
        delegatee: request.delegatee,
        amount: request.amount,
      },
      userId: request.delegator,
    });

    return delegation;
  }

  async revokeDelegation(delegator: string, delegatee: string): Promise<boolean> {
    const delegations = this.delegations.get(delegator);
    if (!delegations) {
      return false;
    }

    const delegationIndex = delegations.findIndex(d => d.delegatee === delegatee && !d.revokedAt);
    if (delegationIndex === -1) {
      return false;
    }

    const delegation = delegations[delegationIndex];
    delegation.revokedAt = new Date();

    // Remove from received delegations
    const received = this.receivedDelegations.get(delegatee);
    if (received) {
      const receivedIndex = received.findIndex(d => d.id === delegation.id);
      if (receivedIndex !== -1) {
        received[receivedIndex].revokedAt = delegation.revokedAt;
      }
    }

    // Emit event
    this.emitEvent({
      type: 'delegation_revoked',
      category: 'governance',
      data: {
        delegationId: delegation.id,
        delegator,
        delegatee,
      },
      userId: delegator,
    });

    return true;
  }

  async getDelegations(userId: string): Promise<DelegationInfo> {
    const delegatedTo = (this.delegations.get(userId) ?? []).filter(d => !d.revokedAt);
    const receivedFrom = (this.receivedDelegations.get(userId) ?? []).filter(d => !d.revokedAt);

    let totalDelegatedPower = BigInt(0);
    let totalReceivedPower = BigInt(0);

    for (const d of delegatedTo) {
      totalDelegatedPower += BigInt(d.amount);
    }

    for (const d of receivedFrom) {
      totalReceivedPower += BigInt(d.amount);
    }

    return {
      delegatedTo,
      receivedFrom,
      totalDelegatedPower: totalDelegatedPower.toString(),
      totalReceivedPower: totalReceivedPower.toString(),
    };
  }

  // --------------------------------------------------------------------------
  // Execution
  // --------------------------------------------------------------------------

  async queueProposal(proposalId: string): Promise<boolean> {
    const proposal = await this.getProposal(proposalId);
    if (!proposal) {
      return false;
    }

    if (proposal.status !== 'passed') {
      throw new Error('Only passed proposals can be queued');
    }

    proposal.status = 'queued';
    return true;
  }

  async executeProposal(proposalId: string): Promise<ProposalExecutionResult> {
    const proposal = await this.getProposal(proposalId);
    if (!proposal) {
      return {
        success: false,
        proposalId,
        executedActions: [],
        timestamp: new Date(),
        error: 'Proposal not found',
      };
    }

    if (proposal.status !== 'queued' && proposal.status !== 'passed') {
      return {
        success: false,
        proposalId,
        executedActions: [],
        timestamp: new Date(),
        error: 'Proposal must be passed or queued to execute',
      };
    }

    // Check execution delay
    const typeConfig = PROPOSAL_TYPE_CONFIG[proposal.type];
    const minExecutionTime = new Date(proposal.votingEndsAt.getTime() + typeConfig.delay * 24 * 60 * 60 * 1000);

    if (new Date() < minExecutionTime) {
      return {
        success: false,
        proposalId,
        executedActions: [],
        timestamp: new Date(),
        error: `Execution delay not met. Earliest execution: ${minExecutionTime.toISOString()}`,
      };
    }

    // Execute actions
    const executedActions: ActionResult[] = [];
    let allSuccess = true;

    for (let i = 0; i < proposal.actions.length; i++) {
      const action = proposal.actions[i];
      try {
        // In production, this would actually execute the action
        // For now, we simulate success
        executedActions.push({
          index: i,
          action,
          success: true,
          result: { executed: true },
        });
      } catch (error) {
        allSuccess = false;
        executedActions.push({
          index: i,
          action,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Update proposal status
    proposal.status = 'executed';
    proposal.executedAt = new Date();

    // Emit event
    this.emitEvent({
      type: 'proposal_executed',
      category: 'governance',
      data: {
        proposalId,
        success: allSuccess,
        actionsExecuted: executedActions.length,
      },
    });

    return {
      success: allSuccess,
      proposalId,
      executedActions,
      timestamp: new Date(),
    };
  }

  // --------------------------------------------------------------------------
  // Voting Power
  // --------------------------------------------------------------------------

  async calculateVotingPower(userId: string, stakedAmount?: string): Promise<VotingPowerResult> {
    // Get base voting power from staked amount
    const baseAmount = stakedAmount ?? this.userVotingPower.get(userId) ?? '0';
    const baseVotingPower = BigInt(baseAmount);

    // Get delegated power
    const delegationInfo = await this.getDelegations(userId);
    const delegatedPower = BigInt(delegationInfo.totalReceivedPower);

    // Subtract delegated out
    const delegatedOut = BigInt(delegationInfo.totalDelegatedPower);

    // Calculate total
    const totalVotingPower = baseVotingPower - delegatedOut + delegatedPower;

    return {
      votingPower: totalVotingPower.toString(),
      baseVotingPower: baseVotingPower.toString(),
      lockBonus: '0', // Would come from staking module
      delegatedPower: delegatedPower.toString(),
      reputationBonus: '0', // Would come from reputation module
      multiplier: 1.0,
    };
  }

  async getTotalVotingPower(): Promise<string> {
    // Sum all user voting power
    let total = BigInt(0);
    for (const power of this.userVotingPower.values()) {
      total += BigInt(power);
    }
    return total.toString();
  }

  private getTotalVotingPowerSync(): string {
    let total = BigInt(0);
    for (const power of this.userVotingPower.values()) {
      total += BigInt(power);
    }
    return total.toString() || '1'; // Avoid division by zero
  }

  // --------------------------------------------------------------------------
  // Statistics
  // --------------------------------------------------------------------------

  async getStats(): Promise<GovernanceStats> {
    // Recalculate active proposals
    this.stats.activeProposals = Array.from(this.proposals.values())
      .filter(p => p.status === 'active').length;

    // Calculate unique voters
    const uniqueVoters = new Set<string>();
    for (const proposalVotes of this.votes.values()) {
      for (const voter of proposalVotes.keys()) {
        uniqueVoters.add(voter);
      }
    }
    this.stats.uniqueVoters = uniqueVoters.size;

    // Calculate average participation
    const proposals = Array.from(this.proposals.values())
      .filter(p => p.status !== 'active' && p.status !== 'pending');
    if (proposals.length > 0) {
      const totalParticipation = proposals.reduce((sum, p) => sum + p.votes.participation, 0);
      this.stats.averageParticipation = totalParticipation / proposals.length;
    }

    return { ...this.stats };
  }

  getParameters(): GovernanceConfig {
    return { ...this.config };
  }

  // --------------------------------------------------------------------------
  // Event Functions
  // --------------------------------------------------------------------------

  onEvent(callback: TokenomicsEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emitEvent(event: Omit<TokenomicsEvent, 'id' | 'timestamp'>): void {
    const fullEvent: TokenomicsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date(),
      ...event,
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(fullEvent);
      } catch {
        // Ignore callback errors
      }
    }
  }

  // --------------------------------------------------------------------------
  // Internal: For testing/development
  // --------------------------------------------------------------------------

  /**
   * Set user voting power (for testing)
   */
  setUserVotingPower(userId: string, power: string): void {
    this.userVotingPower.set(userId, power);
  }

  /**
   * Set treasury balance (for testing)
   */
  setTreasuryBalance(balance: string): void {
    this.stats.treasuryBalance = balance;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGovernanceEngine(config?: Partial<GovernanceConfig>): DefaultGovernanceEngine {
  return new DefaultGovernanceEngine(config);
}

export default DefaultGovernanceEngine;
