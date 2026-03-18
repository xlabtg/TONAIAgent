/**
 * TONAIAgent - Open Agent Protocol Governance Module
 *
 * Protocol Governance layer for the Open Agent Protocol.
 * Provides proposals, voting, and decentralized decision-making.
 */

import {
  Proposal,
  ProposalType,
  ProposalInput,
  Vote,
  VoteType,
  VoteResult,
  ProtocolExecutionResult,
  ActionResult,
} from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Governance configuration
 */
export interface GovernanceConfig {
  /** Proposal configurations by type */
  proposalConfigs: Record<ProposalType, ProposalConfig>;

  /** Minimum voting power to propose */
  minProposalPower: number;

  /** Voting delay in seconds */
  votingDelay: number;

  /** Default voting period in seconds */
  defaultVotingPeriod: number;

  /** Default execution delay in seconds */
  defaultExecutionDelay: number;

  /** Enable timelock */
  enableTimelock: boolean;
}

/**
 * Proposal configuration
 */
export interface ProposalConfig {
  /** Required quorum (0-100) */
  quorum: number;

  /** Required threshold (0-100) */
  threshold: number;

  /** Voting period in seconds */
  votingPeriod: number;

  /** Execution delay in seconds */
  executionDelay: number;
}

/**
 * Voting power snapshot
 */
export interface VotingPowerSnapshot {
  /** Block/timestamp of snapshot */
  snapshotAt: Date;

  /** Address to voting power */
  powers: Map<string, number>;

  /** Total voting power */
  totalPower: number;
}

/**
 * Delegation record
 */
export interface GovernanceDelegation {
  /** Delegator address */
  delegator: string;

  /** Delegatee address */
  delegatee: string;

  /** Delegated power */
  power: number;

  /** Delegation timestamp */
  timestamp: Date;
}

/**
 * Governance event types
 */
export type GovernanceEventType =
  | 'proposal.created'
  | 'proposal.voted'
  | 'proposal.queued'
  | 'proposal.executed'
  | 'proposal.cancelled'
  | 'delegation.created'
  | 'delegation.revoked';

/**
 * Governance event
 */
export interface GovernanceEvent {
  /** Event type */
  type: GovernanceEventType;

  /** Proposal ID (if applicable) */
  proposalId?: string;

  /** Event data */
  data: Record<string, unknown>;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Governance event handler
 */
export type GovernanceEventHandler = (event: GovernanceEvent) => void;

// ============================================================================
// Governance Manager Interface
// ============================================================================

/**
 * Governance manager interface
 */
export interface GovernanceManager {
  /** Create proposal */
  createProposal(input: ProposalInput, proposer: string): Promise<Proposal>;

  /** Get proposal */
  getProposal(proposalId: string): Promise<Proposal | undefined>;

  /** Get active proposals */
  getActiveProposals(): Promise<Proposal[]>;

  /** Get proposal history */
  getProposalHistory(limit?: number): Promise<Proposal[]>;

  /** Vote on proposal */
  vote(proposalId: string, voter: string, voteType: VoteType, reason?: string): Promise<VoteResult>;

  /** Get votes for proposal */
  getVotes(proposalId: string): Promise<Vote[]>;

  /** Queue proposal for execution */
  queue(proposalId: string): Promise<boolean>;

  /** Execute proposal */
  execute(proposalId: string): Promise<ProtocolExecutionResult>;

  /** Cancel proposal */
  cancel(proposalId: string, canceller: string): Promise<boolean>;

  /** Delegate voting power */
  delegate(delegator: string, delegatee: string, power: number): Promise<void>;

  /** Revoke delegation */
  revokeDelegation(delegator: string): Promise<boolean>;

  /** Get voting power */
  getVotingPower(address: string): Promise<number>;

  /** Get delegations */
  getDelegations(address: string): Promise<GovernanceDelegation[]>;

  /** Subscribe to events */
  subscribe(handler: GovernanceEventHandler): () => void;
}

// ============================================================================
// Default Implementation
// ============================================================================

/**
 * Default governance manager implementation
 */
export class DefaultGovernanceManager implements GovernanceManager {
  private config: GovernanceConfig;
  private proposals: Map<string, Proposal> = new Map();
  private votes: Map<string, Vote[]> = new Map();
  private delegations: Map<string, GovernanceDelegation> = new Map();
  private votingPowers: Map<string, number> = new Map();
  private eventHandlers: Set<GovernanceEventHandler> = new Set();

  constructor(config: Partial<GovernanceConfig> = {}) {
    this.config = {
      proposalConfigs: config.proposalConfigs ?? {
        protocol_upgrade: { quorum: 10, threshold: 66, votingPeriod: 604800, executionDelay: 172800 },
        parameter_change: { quorum: 5, threshold: 51, votingPeriod: 259200, executionDelay: 86400 },
        treasury_allocation: { quorum: 5, threshold: 51, votingPeriod: 259200, executionDelay: 86400 },
        emergency_action: { quorum: 1, threshold: 75, votingPeriod: 86400, executionDelay: 0 },
        plugin_approval: { quorum: 3, threshold: 51, votingPeriod: 172800, executionDelay: 43200 },
      },
      minProposalPower: config.minProposalPower ?? 1000,
      votingDelay: config.votingDelay ?? 3600,
      defaultVotingPeriod: config.defaultVotingPeriod ?? 259200,
      defaultExecutionDelay: config.defaultExecutionDelay ?? 86400,
      enableTimelock: config.enableTimelock ?? true,
    };
  }

  /**
   * Create proposal
   */
  async createProposal(input: ProposalInput, proposer: string): Promise<Proposal> {
    // Check proposer voting power
    const power = await this.getVotingPower(proposer);
    if (power < this.config.minProposalPower) {
      throw new Error(`Insufficient voting power: ${power} < ${this.config.minProposalPower}`);
    }

    const proposalConfig = this.config.proposalConfigs[input.type];
    const now = new Date();

    const proposal: Proposal = {
      id: this.generateProposalId(),
      type: input.type,
      title: input.title,
      description: input.description,
      proposer,
      actions: input.actions,
      votingStart: new Date(now.getTime() + this.config.votingDelay * 1000),
      votingEnd: new Date(now.getTime() + (this.config.votingDelay + proposalConfig.votingPeriod) * 1000),
      executionDelay: proposalConfig.executionDelay,
      status: 'active',
      votes: {
        forVotes: 0,
        againstVotes: 0,
        abstainVotes: 0,
        totalVotes: 0,
        totalVotingPower: this.getTotalVotingPower(),
      },
      quorum: proposalConfig.quorum,
      threshold: proposalConfig.threshold,
      createdAt: now,
    };

    this.proposals.set(proposal.id, proposal);
    this.votes.set(proposal.id, []);

    this.emitEvent({
      type: 'proposal.created',
      proposalId: proposal.id,
      data: { title: input.title, type: input.type, proposer },
      timestamp: now,
    });

    return proposal;
  }

  /**
   * Get proposal
   */
  async getProposal(proposalId: string): Promise<Proposal | undefined> {
    const proposal = this.proposals.get(proposalId);
    if (proposal) {
      this.updateProposalStatus(proposal);
    }
    return proposal;
  }

  /**
   * Get active proposals
   */
  async getActiveProposals(): Promise<Proposal[]> {
    const active: Proposal[] = [];

    for (const proposal of this.proposals.values()) {
      this.updateProposalStatus(proposal);
      if (proposal.status === 'active') {
        active.push(proposal);
      }
    }

    return active;
  }

  /**
   * Get proposal history
   */
  async getProposalHistory(limit?: number): Promise<Proposal[]> {
    const all = Array.from(this.proposals.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return limit ? all.slice(0, limit) : all;
  }

  /**
   * Vote on proposal
   */
  async vote(
    proposalId: string,
    voter: string,
    voteType: VoteType,
    reason?: string
  ): Promise<VoteResult> {
    const proposal = await this.getProposal(proposalId);
    if (!proposal) {
      return { success: false, error: 'Proposal not found' };
    }

    if (proposal.status !== 'active') {
      return { success: false, error: `Cannot vote on ${proposal.status} proposal` };
    }

    const now = new Date();
    if (now < proposal.votingStart) {
      return { success: false, error: 'Voting has not started yet' };
    }

    if (now > proposal.votingEnd) {
      return { success: false, error: 'Voting has ended' };
    }

    // Check if already voted
    const existingVotes = this.votes.get(proposalId) ?? [];
    if (existingVotes.some(v => v.voter === voter)) {
      return { success: false, error: 'Already voted' };
    }

    const votingPower = await this.getVotingPower(voter);
    if (votingPower === 0) {
      return { success: false, error: 'No voting power' };
    }

    const vote: Vote = {
      voter,
      proposalId,
      vote: voteType,
      votingPower,
      reason,
      timestamp: now,
    };

    existingVotes.push(vote);
    this.votes.set(proposalId, existingVotes);

    // Update tally
    switch (voteType) {
      case 'for':
        proposal.votes.forVotes += votingPower;
        break;
      case 'against':
        proposal.votes.againstVotes += votingPower;
        break;
      case 'abstain':
        proposal.votes.abstainVotes += votingPower;
        break;
    }
    proposal.votes.totalVotes += votingPower;

    this.emitEvent({
      type: 'proposal.voted',
      proposalId,
      data: { voter, voteType, votingPower },
      timestamp: now,
    });

    return { success: true };
  }

  /**
   * Get votes for proposal
   */
  async getVotes(proposalId: string): Promise<Vote[]> {
    return this.votes.get(proposalId) ?? [];
  }

  /**
   * Queue proposal for execution
   */
  async queue(proposalId: string): Promise<boolean> {
    const proposal = await this.getProposal(proposalId);
    if (!proposal) return false;

    if (proposal.status !== 'succeeded') {
      return false;
    }

    // In production, this would add to a timelock queue
    return true;
  }

  /**
   * Execute proposal
   */
  async execute(proposalId: string): Promise<ProtocolExecutionResult> {
    const proposal = await this.getProposal(proposalId);
    if (!proposal) {
      return { success: false, actionResults: [], error: 'Proposal not found' };
    }

    if (proposal.status !== 'succeeded') {
      return { success: false, actionResults: [], error: `Cannot execute ${proposal.status} proposal` };
    }

    // Check execution delay
    const now = new Date();
    const canExecuteAt = new Date(proposal.votingEnd.getTime() + proposal.executionDelay * 1000);
    if (this.config.enableTimelock && now < canExecuteAt) {
      return { success: false, actionResults: [], error: 'Execution delay not passed' };
    }

    // Execute actions
    const actionResults: ActionResult[] = [];

    for (let i = 0; i < proposal.actions.length; i++) {
      const _action = proposal.actions[i];
      try {
        // Simulate action execution (action details would be used in production)
        void _action;
        actionResults.push({
          index: i,
          success: true,
          returnData: { executed: true },
        });
      } catch (error) {
        actionResults.push({
          index: i,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const allSucceeded = actionResults.every(r => r.success);
    proposal.status = allSucceeded ? 'executed' : 'defeated';
    proposal.executedAt = now;

    this.emitEvent({
      type: 'proposal.executed',
      proposalId,
      data: { success: allSucceeded },
      timestamp: now,
    });

    return {
      success: allSucceeded,
      actionResults,
    };
  }

  /**
   * Cancel proposal
   */
  async cancel(proposalId: string, canceller: string): Promise<boolean> {
    const proposal = await this.getProposal(proposalId);
    if (!proposal) return false;

    // Only proposer can cancel
    if (proposal.proposer !== canceller) {
      return false;
    }

    if (proposal.status !== 'active' && proposal.status !== 'draft') {
      return false;
    }

    proposal.status = 'cancelled';

    this.emitEvent({
      type: 'proposal.cancelled',
      proposalId,
      data: { canceller },
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Delegate voting power
   */
  async delegate(delegator: string, delegatee: string, power: number): Promise<void> {
    const delegation: GovernanceDelegation = {
      delegator,
      delegatee,
      power,
      timestamp: new Date(),
    };

    this.delegations.set(delegator, delegation);

    this.emitEvent({
      type: 'delegation.created',
      data: { delegator, delegatee, power },
      timestamp: new Date(),
    });
  }

  /**
   * Revoke delegation
   */
  async revokeDelegation(delegator: string): Promise<boolean> {
    const existed = this.delegations.delete(delegator);

    if (existed) {
      this.emitEvent({
        type: 'delegation.revoked',
        data: { delegator },
        timestamp: new Date(),
      });
    }

    return existed;
  }

  /**
   * Get voting power
   */
  async getVotingPower(address: string): Promise<number> {
    let power = this.votingPowers.get(address) ?? 0;

    // Add delegated power
    for (const delegation of this.delegations.values()) {
      if (delegation.delegatee === address) {
        power += delegation.power;
      }
    }

    // Subtract power delegated away
    const outgoing = this.delegations.get(address);
    if (outgoing) {
      power -= outgoing.power;
    }

    return Math.max(0, power);
  }

  /**
   * Get delegations
   */
  async getDelegations(address: string): Promise<GovernanceDelegation[]> {
    const delegations: GovernanceDelegation[] = [];

    for (const delegation of this.delegations.values()) {
      if (delegation.delegator === address || delegation.delegatee === address) {
        delegations.push(delegation);
      }
    }

    return delegations;
  }

  /**
   * Set voting power (for testing/initialization)
   */
  setVotingPower(address: string, power: number): void {
    this.votingPowers.set(address, power);
  }

  /**
   * Subscribe to events
   */
  subscribe(handler: GovernanceEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private generateProposalId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 11);
    return `prop_${timestamp}_${random}`;
  }

  private getTotalVotingPower(): number {
    let total = 0;
    for (const power of this.votingPowers.values()) {
      total += power;
    }
    return total;
  }

  private updateProposalStatus(proposal: Proposal): void {
    if (proposal.status === 'executed' || proposal.status === 'cancelled') {
      return;
    }

    const now = new Date();

    // Check if voting has ended
    if (now > proposal.votingEnd && proposal.status === 'active') {
      // Calculate results
      const quorumMet = (proposal.votes.totalVotes / proposal.votes.totalVotingPower) * 100 >= proposal.quorum;
      const thresholdMet =
        proposal.votes.totalVotes > 0 &&
        (proposal.votes.forVotes / proposal.votes.totalVotes) * 100 >= proposal.threshold;

      if (quorumMet && thresholdMet) {
        proposal.status = 'succeeded';
      } else {
        proposal.status = 'defeated';
      }
    }

    // Check expiry
    if (proposal.status === 'succeeded') {
      const expiryTime = proposal.votingEnd.getTime() + proposal.executionDelay * 1000 + 14 * 24 * 60 * 60 * 1000;
      if (now.getTime() > expiryTime) {
        proposal.status = 'expired';
      }
    }
  }

  private emitEvent(event: GovernanceEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in governance event handler:', error);
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create governance manager
 */
export function createGovernanceManager(config?: Partial<GovernanceConfig>): GovernanceManager {
  return new DefaultGovernanceManager(config);
}
