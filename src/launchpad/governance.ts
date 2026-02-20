/**
 * TONAIAgent - DAO Governance Integration
 *
 * Governance framework enabling DAOs to manage treasury agents through
 * proposal-based strategy updates, voting-controlled execution, and
 * role-based access controls.
 */

import {
  GovernanceConfig,
  GovernanceProposal,
  ProposalType,
  ProposalStatus,
  ProposalAction,
  Vote,
  LaunchpadEvent,
  LaunchpadEventCallback,
} from './types';

// ============================================================================
// Governance Manager Interface
// ============================================================================

export interface GovernanceManager {
  // Configuration
  configureGovernance(organizationId: string, config: Partial<GovernanceConfig>): Promise<GovernanceConfig>;
  getGovernanceConfig(organizationId: string): GovernanceConfig | undefined;

  // Proposals
  createProposal(input: CreateProposalInput): Promise<GovernanceProposal>;
  getProposal(proposalId: string): GovernanceProposal | undefined;
  listProposals(organizationId: string, filters?: ProposalFilters): GovernanceProposal[];
  cancelProposal(proposalId: string, cancelerId: string, reason: string): Promise<boolean>;

  // Voting
  castVote(input: CastVoteInput): Promise<Vote>;
  getVotes(proposalId: string): Vote[];
  delegateVotingPower(input: DelegateVotingInput): Promise<boolean>;
  revokeVotingDelegation(fromUserId: string, toUserId: string): Promise<boolean>;

  // Execution
  executeProposal(proposalId: string, executorId: string): Promise<ExecutionResult>;
  queueProposal(proposalId: string): Promise<void>;

  // Quorum & Results
  checkQuorum(proposalId: string): QuorumCheck;
  calculateResults(proposalId: string): ProposalResults;
  finalizeProposal(proposalId: string): Promise<GovernanceProposal>;

  // Member management
  getMemberVotingPower(organizationId: string, userId: string): number;
  getTotalVotingPower(organizationId: string): number;

  // Events
  onEvent(callback: LaunchpadEventCallback): void;
}

// ============================================================================
// Input/Output Types
// ============================================================================

export interface CreateProposalInput {
  organizationId: string;
  agentId?: string;
  type: ProposalType;
  title: string;
  description: string;
  proposer: string;
  actions: ProposalAction[];
  votingPeriodHours?: number;
  metadata?: Record<string, unknown>;
}

export interface ProposalFilters {
  status?: ProposalStatus[];
  type?: ProposalType[];
  agentId?: string;
  proposer?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface CastVoteInput {
  proposalId: string;
  voter: string;
  support: 'for' | 'against' | 'abstain';
  reason?: string;
}

export interface DelegateVotingInput {
  fromUserId: string;
  toUserId: string;
  organizationId: string;
  percentage?: number; // Default 100%
  expiration?: Date;
}

export interface ExecutionResult {
  success: boolean;
  proposalId: string;
  executedActions: ExecutedAction[];
  errors: string[];
  transactionHash?: string;
  executedAt: Date;
}

export interface ExecutedAction {
  actionIndex: number;
  type: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface QuorumCheck {
  reached: boolean;
  required: number;
  current: number;
  percentage: number;
  votingPowerCast: number;
  totalVotingPower: number;
}

export interface ProposalResults {
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalVotes: number;
  votingPowerFor: number;
  votingPowerAgainst: number;
  votingPowerAbstain: number;
  totalVotingPowerCast: number;
  approved: boolean;
  vetoedBy?: string[];
  participation: number;
}

export interface VotingDelegation {
  id: string;
  fromUserId: string;
  toUserId: string;
  organizationId: string;
  percentage: number;
  createdAt: Date;
  expiresAt?: Date;
  active: boolean;
}

// ============================================================================
// Default Governance Manager Implementation
// ============================================================================

export interface GovernanceManagerConfig {
  defaultVotingPeriodHours?: number;
  defaultQuorumPercent?: number;
  defaultApprovalThresholdPercent?: number;
  maxProposalsPerDay?: number;
}

export class DefaultGovernanceManager implements GovernanceManager {
  private configs: Map<string, GovernanceConfig> = new Map();
  private proposals: Map<string, GovernanceProposal> = new Map();
  private votes: Map<string, Vote[]> = new Map();
  private delegations: Map<string, VotingDelegation[]> = new Map();
  private memberVotingPower: Map<string, Map<string, number>> = new Map(); // orgId -> userId -> power
  private eventCallbacks: LaunchpadEventCallback[] = [];
  private managerConfig: GovernanceManagerConfig;

  constructor(config: Partial<GovernanceManagerConfig> = {}) {
    this.managerConfig = {
      defaultVotingPeriodHours: config.defaultVotingPeriodHours ?? 72,
      defaultQuorumPercent: config.defaultQuorumPercent ?? 10,
      defaultApprovalThresholdPercent: config.defaultApprovalThresholdPercent ?? 50,
      maxProposalsPerDay: config.maxProposalsPerDay ?? 10,
    };
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  async configureGovernance(
    organizationId: string,
    config: Partial<GovernanceConfig>
  ): Promise<GovernanceConfig> {
    const existing = this.configs.get(organizationId);

    const newConfig: GovernanceConfig = {
      type: config.type ?? existing?.type ?? 'token_voting',
      votingPeriodHours: config.votingPeriodHours ?? existing?.votingPeriodHours ?? this.managerConfig.defaultVotingPeriodHours!,
      quorumPercent: config.quorumPercent ?? existing?.quorumPercent ?? this.managerConfig.defaultQuorumPercent!,
      approvalThresholdPercent: config.approvalThresholdPercent ?? existing?.approvalThresholdPercent ?? this.managerConfig.defaultApprovalThresholdPercent!,
      vetoEnabled: config.vetoEnabled ?? existing?.vetoEnabled ?? false,
      vetoThresholdPercent: config.vetoThresholdPercent ?? existing?.vetoThresholdPercent ?? 33,
      timelockHours: config.timelockHours ?? existing?.timelockHours ?? 24,
      delegationEnabled: config.delegationEnabled ?? existing?.delegationEnabled ?? true,
      executionDelay: config.executionDelay ?? existing?.executionDelay ?? 0,
    };

    this.configs.set(organizationId, newConfig);

    this.emitEvent('organization_updated', organizationId, undefined, {
      type: 'governance_configured',
      config: newConfig,
    });

    return newConfig;
  }

  getGovernanceConfig(organizationId: string): GovernanceConfig | undefined {
    return this.configs.get(organizationId);
  }

  // ============================================================================
  // Proposals
  // ============================================================================

  async createProposal(input: CreateProposalInput): Promise<GovernanceProposal> {
    const config = this.configs.get(input.organizationId);
    if (!config) {
      throw new Error(`Governance not configured for organization ${input.organizationId}`);
    }

    // Check daily proposal limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaysProposals = Array.from(this.proposals.values()).filter(
      (p) => p.organizationId === input.organizationId && p.createdAt >= todayStart
    );

    if (todaysProposals.length >= (this.managerConfig.maxProposalsPerDay ?? 10)) {
      throw new Error('Daily proposal limit reached');
    }

    // Validate proposer has voting power
    const proposerPower = this.getMemberVotingPower(input.organizationId, input.proposer);
    if (proposerPower === 0) {
      throw new Error('Proposer has no voting power');
    }

    const proposalId = `proposal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();
    const votingPeriod = input.votingPeriodHours ?? config.votingPeriodHours;
    const votingEnd = new Date(now.getTime() + votingPeriod * 60 * 60 * 1000);

    const proposal: GovernanceProposal = {
      id: proposalId,
      organizationId: input.organizationId,
      agentId: input.agentId,
      type: input.type,
      title: input.title,
      description: input.description,
      proposer: input.proposer,
      status: 'active',
      actions: input.actions,
      votingStart: now,
      votingEnd,
      votes: [],
      quorumReached: false,
      approved: false,
      createdAt: now,
    };

    this.proposals.set(proposalId, proposal);
    this.votes.set(proposalId, []);

    this.emitEvent('proposal_created', input.organizationId, input.agentId, {
      proposalId,
      type: input.type,
      title: input.title,
      proposer: input.proposer,
    });

    return proposal;
  }

  getProposal(proposalId: string): GovernanceProposal | undefined {
    return this.proposals.get(proposalId);
  }

  listProposals(organizationId: string, filters?: ProposalFilters): GovernanceProposal[] {
    let proposals = Array.from(this.proposals.values()).filter(
      (p) => p.organizationId === organizationId
    );

    if (filters) {
      if (filters.status && filters.status.length > 0) {
        proposals = proposals.filter((p) => filters.status!.includes(p.status));
      }
      if (filters.type && filters.type.length > 0) {
        proposals = proposals.filter((p) => filters.type!.includes(p.type));
      }
      if (filters.agentId) {
        proposals = proposals.filter((p) => p.agentId === filters.agentId);
      }
      if (filters.proposer) {
        proposals = proposals.filter((p) => p.proposer === filters.proposer);
      }
      if (filters.startDate) {
        proposals = proposals.filter((p) => p.createdAt >= filters.startDate!);
      }
      if (filters.endDate) {
        proposals = proposals.filter((p) => p.createdAt <= filters.endDate!);
      }
    }

    return proposals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async cancelProposal(proposalId: string, cancelerId: string, reason: string): Promise<boolean> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      return false;
    }

    if (proposal.status !== 'active' && proposal.status !== 'draft') {
      throw new Error(`Cannot cancel proposal in ${proposal.status} status`);
    }

    // Only proposer can cancel (or admin in production)
    if (proposal.proposer !== cancelerId) {
      throw new Error('Only the proposer can cancel the proposal');
    }

    proposal.status = 'cancelled';

    this.emitEvent('proposal_voted', proposal.organizationId, proposal.agentId, {
      proposalId,
      action: 'cancelled',
      cancelerId,
      reason,
    });

    return true;
  }

  // ============================================================================
  // Voting
  // ============================================================================

  async castVote(input: CastVoteInput): Promise<Vote> {
    const proposal = this.proposals.get(input.proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${input.proposalId}`);
    }

    if (proposal.status !== 'active') {
      throw new Error(`Cannot vote on proposal in ${proposal.status} status`);
    }

    if (new Date() > proposal.votingEnd) {
      throw new Error('Voting period has ended');
    }

    // Check if already voted
    const existingVotes = this.votes.get(input.proposalId) ?? [];
    const existingVote = existingVotes.find((v) => v.voter === input.voter);
    if (existingVote) {
      throw new Error('Already voted on this proposal');
    }

    // Get voting power (including delegated)
    const votingPower = this.getEffectiveVotingPower(proposal.organizationId, input.voter);
    if (votingPower === 0) {
      throw new Error('No voting power');
    }

    const vote: Vote = {
      id: `vote_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      proposalId: input.proposalId,
      voter: input.voter,
      votingPower,
      support: input.support,
      reason: input.reason,
      timestamp: new Date(),
    };

    existingVotes.push(vote);
    this.votes.set(input.proposalId, existingVotes);
    proposal.votes = existingVotes;

    // Check if quorum reached
    const quorumCheck = this.checkQuorum(input.proposalId);
    proposal.quorumReached = quorumCheck.reached;

    this.emitEvent('proposal_voted', proposal.organizationId, proposal.agentId, {
      proposalId: input.proposalId,
      voter: input.voter,
      support: input.support,
      votingPower,
    });

    return vote;
  }

  getVotes(proposalId: string): Vote[] {
    return this.votes.get(proposalId) ?? [];
  }

  async delegateVotingPower(input: DelegateVotingInput): Promise<boolean> {
    const config = this.configs.get(input.organizationId);
    if (!config?.delegationEnabled) {
      throw new Error('Delegation is not enabled for this organization');
    }

    // Check that from user has voting power
    const fromPower = this.getMemberVotingPower(input.organizationId, input.fromUserId);
    if (fromPower === 0) {
      throw new Error('Delegator has no voting power');
    }

    // Create delegation
    const delegation: VotingDelegation = {
      id: `delegation_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      organizationId: input.organizationId,
      percentage: input.percentage ?? 100,
      createdAt: new Date(),
      expiresAt: input.expiration,
      active: true,
    };

    const orgDelegations = this.delegations.get(input.organizationId) ?? [];

    // Remove existing delegation from same user
    const filtered = orgDelegations.filter(
      (d) => d.fromUserId !== input.fromUserId || !d.active
    );
    filtered.push(delegation);
    this.delegations.set(input.organizationId, filtered);

    return true;
  }

  async revokeVotingDelegation(fromUserId: string, toUserId: string): Promise<boolean> {
    for (const [, delegations] of this.delegations) {
      const delegation = delegations.find(
        (d) => d.fromUserId === fromUserId && d.toUserId === toUserId && d.active
      );
      if (delegation) {
        delegation.active = false;
        return true;
      }
    }
    return false;
  }

  // ============================================================================
  // Execution
  // ============================================================================

  async executeProposal(proposalId: string, executorId: string): Promise<ExecutionResult> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      return {
        success: false,
        proposalId,
        executedActions: [],
        errors: ['Proposal not found'],
        executedAt: new Date(),
      };
    }

    if (proposal.status !== 'passed') {
      return {
        success: false,
        proposalId,
        executedActions: [],
        errors: [`Cannot execute proposal in ${proposal.status} status`],
        executedAt: new Date(),
      };
    }

    const config = this.configs.get(proposal.organizationId);
    if (config && config.timelockHours > 0) {
      const timelockEnd = new Date(
        proposal.votingEnd.getTime() + config.timelockHours * 60 * 60 * 1000
      );
      if (new Date() < timelockEnd) {
        return {
          success: false,
          proposalId,
          executedActions: [],
          errors: [`Timelock not expired. Can execute after ${timelockEnd.toISOString()}`],
          executedAt: new Date(),
        };
      }
    }

    // Execute actions
    const executedActions: ExecutedAction[] = [];
    const errors: string[] = [];

    for (let i = 0; i < proposal.actions.length; i++) {
      const action = proposal.actions[i];
      try {
        // In production, this would actually execute the action
        // For now, we simulate successful execution
        executedActions.push({
          actionIndex: i,
          type: action.type,
          success: true,
          result: { simulated: true },
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        executedActions.push({
          actionIndex: i,
          type: action.type,
          success: false,
          error: errorMsg,
        });
        errors.push(`Action ${i} failed: ${errorMsg}`);
      }
    }

    const allSuccess = executedActions.every((a) => a.success);

    if (allSuccess) {
      proposal.status = 'executed';
      proposal.executedAt = new Date();
    }

    this.emitEvent('proposal_executed', proposal.organizationId, proposal.agentId, {
      proposalId,
      executor: executorId,
      success: allSuccess,
      actionsExecuted: executedActions.length,
    });

    return {
      success: allSuccess,
      proposalId,
      executedActions,
      errors,
      executedAt: new Date(),
    };
  }

  async queueProposal(proposalId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    // Finalize first if voting has ended
    if (proposal.status === 'active' && new Date() > proposal.votingEnd) {
      await this.finalizeProposal(proposalId);
    }
  }

  // ============================================================================
  // Quorum & Results
  // ============================================================================

  checkQuorum(proposalId: string): QuorumCheck {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      return {
        reached: false,
        required: 0,
        current: 0,
        percentage: 0,
        votingPowerCast: 0,
        totalVotingPower: 0,
      };
    }

    const config = this.configs.get(proposal.organizationId);
    if (!config) {
      return {
        reached: false,
        required: 0,
        current: 0,
        percentage: 0,
        votingPowerCast: 0,
        totalVotingPower: 0,
      };
    }

    const votes = this.votes.get(proposalId) ?? [];
    const totalVotingPower = this.getTotalVotingPower(proposal.organizationId);
    const votingPowerCast = votes.reduce((sum, v) => sum + v.votingPower, 0);
    const percentage = totalVotingPower > 0 ? (votingPowerCast / totalVotingPower) * 100 : 0;

    return {
      reached: percentage >= config.quorumPercent,
      required: config.quorumPercent,
      current: percentage,
      percentage,
      votingPowerCast,
      totalVotingPower,
    };
  }

  calculateResults(proposalId: string): ProposalResults {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      return {
        votesFor: 0,
        votesAgainst: 0,
        votesAbstain: 0,
        totalVotes: 0,
        votingPowerFor: 0,
        votingPowerAgainst: 0,
        votingPowerAbstain: 0,
        totalVotingPowerCast: 0,
        approved: false,
        participation: 0,
      };
    }

    const config = this.configs.get(proposal.organizationId);
    const votes = this.votes.get(proposalId) ?? [];
    const totalVotingPower = this.getTotalVotingPower(proposal.organizationId);

    const votesFor = votes.filter((v) => v.support === 'for').length;
    const votesAgainst = votes.filter((v) => v.support === 'against').length;
    const votesAbstain = votes.filter((v) => v.support === 'abstain').length;

    const votingPowerFor = votes
      .filter((v) => v.support === 'for')
      .reduce((sum, v) => sum + v.votingPower, 0);
    const votingPowerAgainst = votes
      .filter((v) => v.support === 'against')
      .reduce((sum, v) => sum + v.votingPower, 0);
    const votingPowerAbstain = votes
      .filter((v) => v.support === 'abstain')
      .reduce((sum, v) => sum + v.votingPower, 0);

    const totalVotingPowerCast = votingPowerFor + votingPowerAgainst + votingPowerAbstain;
    const participation = totalVotingPower > 0 ? (totalVotingPowerCast / totalVotingPower) * 100 : 0;

    // Calculate if approved (ignoring abstain for approval threshold)
    const votingPowerForApproval = votingPowerFor + votingPowerAgainst;
    const approvalPercent =
      votingPowerForApproval > 0 ? (votingPowerFor / votingPowerForApproval) * 100 : 0;
    const quorumReached = this.checkQuorum(proposalId).reached;
    const approved =
      quorumReached && approvalPercent >= (config?.approvalThresholdPercent ?? 50);

    return {
      votesFor,
      votesAgainst,
      votesAbstain,
      totalVotes: votes.length,
      votingPowerFor,
      votingPowerAgainst,
      votingPowerAbstain,
      totalVotingPowerCast,
      approved,
      participation,
    };
  }

  async finalizeProposal(proposalId: string): Promise<GovernanceProposal> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.status !== 'active') {
      return proposal;
    }

    if (new Date() < proposal.votingEnd) {
      throw new Error('Voting period has not ended');
    }

    const results = this.calculateResults(proposalId);
    proposal.quorumReached = this.checkQuorum(proposalId).reached;
    proposal.approved = results.approved;

    if (results.approved) {
      proposal.status = 'passed';
    } else if (!proposal.quorumReached) {
      proposal.status = 'failed';
    } else {
      proposal.status = 'failed';
    }

    this.emitEvent('proposal_voted', proposal.organizationId, proposal.agentId, {
      proposalId,
      action: 'finalized',
      status: proposal.status,
      approved: proposal.approved,
      quorumReached: proposal.quorumReached,
    });

    return proposal;
  }

  // ============================================================================
  // Member Management
  // ============================================================================

  getMemberVotingPower(organizationId: string, userId: string): number {
    const orgPowers = this.memberVotingPower.get(organizationId);
    if (!orgPowers) {
      return 0;
    }
    return orgPowers.get(userId) ?? 0;
  }

  getTotalVotingPower(organizationId: string): number {
    const orgPowers = this.memberVotingPower.get(organizationId);
    if (!orgPowers) {
      return 0;
    }
    return Array.from(orgPowers.values()).reduce((sum, power) => sum + power, 0);
  }

  // Helper to set voting power (for testing and initialization)
  setMemberVotingPower(organizationId: string, userId: string, power: number): void {
    let orgPowers = this.memberVotingPower.get(organizationId);
    if (!orgPowers) {
      orgPowers = new Map();
      this.memberVotingPower.set(organizationId, orgPowers);
    }
    orgPowers.set(userId, power);
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: LaunchpadEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getEffectiveVotingPower(organizationId: string, userId: string): number {
    let basePower = this.getMemberVotingPower(organizationId, userId);

    // Add delegated power
    const orgDelegations = this.delegations.get(organizationId) ?? [];
    for (const delegation of orgDelegations) {
      if (delegation.toUserId === userId && delegation.active) {
        // Check if delegation has expired
        if (delegation.expiresAt && new Date() > delegation.expiresAt) {
          delegation.active = false;
          continue;
        }

        const delegatedPower = this.getMemberVotingPower(organizationId, delegation.fromUserId);
        basePower += delegatedPower * (delegation.percentage / 100);
      }
    }

    return basePower;
  }

  private emitEvent(
    type: LaunchpadEvent['type'],
    organizationId: string,
    agentId?: string,
    data: Record<string, unknown> = {}
  ): void {
    const event: LaunchpadEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      organizationId,
      agentId,
      timestamp: new Date(),
      data,
      severity: 'info',
      metadata: {},
    };

    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGovernanceManager(
  config?: Partial<GovernanceManagerConfig>
): DefaultGovernanceManager {
  return new DefaultGovernanceManager(config);
}
