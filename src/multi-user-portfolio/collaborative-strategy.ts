/**
 * TONAIAgent - Collaborative Strategy Management
 *
 * Enables team members to propose, review, vote on, and implement
 * portfolio strategy changes collaboratively. Supports analyst proposals,
 * manager review, and owner approval workflows.
 */

import {
  StrategyProposal,
  StrategyProposalStatus,
  StrategyVote,
  CreateStrategyProposalInput,
  CurrentAllocation,
  MultiUserPortfolioEvent,
  MultiUserPortfolioEventCallback,
} from './types';

// ============================================================================
// Collaborative Strategy Manager Interface
// ============================================================================

export interface CollaborativeStrategyManager {
  createProposal(input: CreateStrategyProposalInput): Promise<StrategyProposal>;
  getProposal(proposalId: string): StrategyProposal | undefined;
  listProposals(portfolioId: string, status?: StrategyProposalStatus): StrategyProposal[];

  submitForReview(proposalId: string, submittedBy: string): Promise<StrategyProposal>;
  approveProposal(proposalId: string, reviewedBy: string, notes?: string): Promise<StrategyProposal>;
  rejectProposal(proposalId: string, reviewedBy: string, notes: string): Promise<StrategyProposal>;
  withdrawProposal(proposalId: string, withdrawnBy: string): Promise<StrategyProposal>;
  markImplemented(proposalId: string, implementedBy: string): Promise<StrategyProposal>;

  castVote(
    proposalId: string,
    voterId: string,
    vote: StrategyVote['vote'],
    comment?: string,
  ): Promise<StrategyVote>;
  getVotes(proposalId: string): StrategyVote[];

  getCurrentAllocations(portfolioId: string): CurrentAllocation[];
  setCurrentAllocations(portfolioId: string, allocations: CurrentAllocation[]): void;

  onEvent(callback: MultiUserPortfolioEventCallback): void;
}

// ============================================================================
// Default Collaborative Strategy Manager Implementation
// ============================================================================

export class DefaultCollaborativeStrategyManager implements CollaborativeStrategyManager {
  private readonly proposals = new Map<string, StrategyProposal>();
  private readonly currentAllocations = new Map<string, CurrentAllocation[]>();
  private readonly eventCallbacks: MultiUserPortfolioEventCallback[] = [];

  async createProposal(input: CreateStrategyProposalInput): Promise<StrategyProposal> {
    const proposalId = `proposal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();

    // Enrich proposals with change percent relative to current allocations
    const current = this.currentAllocations.get(input.portfolioId) ?? [];
    const proposedAllocations = input.proposedAllocations.map(pa => {
      const currentAlloc = current.find(c => c.assetId === pa.assetId);
      return {
        ...pa,
        changePercent: pa.targetPercent - (currentAlloc?.currentPercent ?? 0),
      };
    });

    const proposal: StrategyProposal = {
      id: proposalId,
      portfolioId: input.portfolioId,
      proposedBy: input.proposedBy,
      title: input.title,
      description: input.description,
      status: 'draft',
      proposedAllocations,
      currentAllocations: current,
      rationale: input.rationale,
      expectedImpact: {
        ...input.expectedImpact,
      },
      votes: [],
      createdAt: now,
      updatedAt: now,
    };

    this.proposals.set(proposalId, proposal);

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: now,
      type: 'strategy_proposed',
      portfolioId: input.portfolioId,
      actorId: input.proposedBy,
      severity: 'info',
      source: 'CollaborativeStrategyManager',
      message: `Strategy proposal '${input.title}' created`,
      data: { proposalId, title: input.title, proposedBy: input.proposedBy },
    });

    return proposal;
  }

  getProposal(proposalId: string): StrategyProposal | undefined {
    return this.proposals.get(proposalId);
  }

  listProposals(portfolioId: string, status?: StrategyProposalStatus): StrategyProposal[] {
    const proposals = Array.from(this.proposals.values()).filter(
      p => p.portfolioId === portfolioId,
    );
    if (status) {
      return proposals.filter(p => p.status === status);
    }
    return proposals;
  }

  async submitForReview(proposalId: string, submittedBy: string): Promise<StrategyProposal> {
    const proposal = this.requireProposal(proposalId);

    if (proposal.status !== 'draft') {
      throw new Error(`Proposal must be in 'draft' status to submit for review. Current status: '${proposal.status}'`);
    }

    if (proposal.proposedBy !== submittedBy) {
      throw new Error('Only the proposal author can submit it for review');
    }

    return this.updateProposalStatus(proposalId, 'pending_review', submittedBy);
  }

  async approveProposal(
    proposalId: string,
    reviewedBy: string,
    notes?: string,
  ): Promise<StrategyProposal> {
    const proposal = this.requireProposal(proposalId);

    if (proposal.status !== 'pending_review') {
      throw new Error(`Proposal must be in 'pending_review' status to approve. Current status: '${proposal.status}'`);
    }

    const now = new Date();
    const updated: StrategyProposal = {
      ...proposal,
      status: 'approved',
      reviewedBy,
      reviewedAt: now,
      reviewNotes: notes,
      updatedAt: now,
    };

    this.proposals.set(proposalId, updated);

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: now,
      type: 'strategy_approved',
      portfolioId: proposal.portfolioId,
      actorId: reviewedBy,
      severity: 'info',
      source: 'CollaborativeStrategyManager',
      message: `Strategy proposal '${proposal.title}' approved`,
      data: { proposalId, title: proposal.title, approvedBy: reviewedBy, notes },
    });

    return updated;
  }

  async rejectProposal(
    proposalId: string,
    reviewedBy: string,
    notes: string,
  ): Promise<StrategyProposal> {
    const proposal = this.requireProposal(proposalId);

    if (proposal.status !== 'pending_review') {
      throw new Error(`Proposal must be in 'pending_review' status to reject. Current status: '${proposal.status}'`);
    }

    const now = new Date();
    const updated: StrategyProposal = {
      ...proposal,
      status: 'rejected',
      reviewedBy,
      reviewedAt: now,
      reviewNotes: notes,
      updatedAt: now,
    };

    this.proposals.set(proposalId, updated);

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: now,
      type: 'strategy_rejected',
      portfolioId: proposal.portfolioId,
      actorId: reviewedBy,
      severity: 'info',
      source: 'CollaborativeStrategyManager',
      message: `Strategy proposal '${proposal.title}' rejected`,
      data: { proposalId, title: proposal.title, rejectedBy: reviewedBy, notes },
    });

    return updated;
  }

  async withdrawProposal(proposalId: string, withdrawnBy: string): Promise<StrategyProposal> {
    const proposal = this.requireProposal(proposalId);

    if (!['draft', 'pending_review'].includes(proposal.status)) {
      throw new Error(`Proposal can only be withdrawn if in 'draft' or 'pending_review' status. Current: '${proposal.status}'`);
    }

    if (proposal.proposedBy !== withdrawnBy) {
      throw new Error('Only the proposal author can withdraw it');
    }

    return this.updateProposalStatus(proposalId, 'withdrawn', withdrawnBy);
  }

  async markImplemented(proposalId: string, implementedBy: string): Promise<StrategyProposal> {
    const proposal = this.requireProposal(proposalId);

    if (proposal.status !== 'approved') {
      throw new Error(`Proposal must be in 'approved' status to mark as implemented. Current: '${proposal.status}'`);
    }

    const now = new Date();
    const updated: StrategyProposal = {
      ...proposal,
      status: 'implemented',
      implementedAt: now,
      updatedAt: now,
    };

    this.proposals.set(proposalId, updated);

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: now,
      type: 'strategy_approved', // reuse for implemented
      portfolioId: proposal.portfolioId,
      actorId: implementedBy,
      severity: 'info',
      source: 'CollaborativeStrategyManager',
      message: `Strategy proposal '${proposal.title}' implemented`,
      data: { proposalId, title: proposal.title, implementedBy },
    });

    return updated;
  }

  async castVote(
    proposalId: string,
    voterId: string,
    vote: StrategyVote['vote'],
    comment?: string,
  ): Promise<StrategyVote> {
    const proposal = this.requireProposal(proposalId);

    if (proposal.status !== 'pending_review') {
      throw new Error(`Votes can only be cast on proposals with 'pending_review' status. Current: '${proposal.status}'`);
    }

    // Check if voter already voted
    const existingVoteIndex = proposal.votes.findIndex(v => v.voterId === voterId);

    const newVote: StrategyVote = {
      id: `vote_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      proposalId,
      voterId,
      vote,
      comment,
      votedAt: new Date(),
    };

    let updatedVotes: StrategyVote[];
    if (existingVoteIndex !== -1) {
      // Replace existing vote
      updatedVotes = [...proposal.votes];
      updatedVotes[existingVoteIndex] = newVote;
    } else {
      updatedVotes = [...proposal.votes, newVote];
    }

    this.proposals.set(proposalId, {
      ...proposal,
      votes: updatedVotes,
      updatedAt: new Date(),
    });

    return newVote;
  }

  getVotes(proposalId: string): StrategyVote[] {
    return this.requireProposal(proposalId).votes;
  }

  getCurrentAllocations(portfolioId: string): CurrentAllocation[] {
    return this.currentAllocations.get(portfolioId) ?? [];
  }

  setCurrentAllocations(portfolioId: string, allocations: CurrentAllocation[]): void {
    this.currentAllocations.set(portfolioId, allocations);
  }

  onEvent(callback: MultiUserPortfolioEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private requireProposal(proposalId: string): StrategyProposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Strategy proposal not found: ${proposalId}`);
    }
    return proposal;
  }

  private async updateProposalStatus(
    proposalId: string,
    status: StrategyProposalStatus,
    actorId: string,
  ): Promise<StrategyProposal> {
    const proposal = this.requireProposal(proposalId);
    const now = new Date();
    const updated: StrategyProposal = {
      ...proposal,
      status,
      updatedAt: now,
    };
    this.proposals.set(proposalId, updated);

    const eventTypeMap: Record<string, MultiUserPortfolioEvent['type']> = {
      pending_review: 'strategy_proposed',
      approved: 'strategy_approved',
      rejected: 'strategy_rejected',
      withdrawn: 'strategy_rejected',
      implemented: 'strategy_approved',
    };

    this.emitEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: now,
      type: eventTypeMap[status] ?? 'strategy_proposed',
      portfolioId: proposal.portfolioId,
      actorId,
      severity: 'info',
      source: 'CollaborativeStrategyManager',
      message: `Strategy proposal '${proposal.title}' status changed to '${status}'`,
      data: { proposalId, title: proposal.title, status },
    });

    return updated;
  }

  private emitEvent(event: MultiUserPortfolioEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* ignore callback errors */ }
    }
  }
}

export function createCollaborativeStrategyManager(): DefaultCollaborativeStrategyManager {
  return new DefaultCollaborativeStrategyManager();
}
