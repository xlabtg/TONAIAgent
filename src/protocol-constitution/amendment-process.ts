/**
 * TONAIAgent - Protocol Constitution: Amendment Process (Issue #126)
 *
 * Manages the constitutional amendment process: proposals, community review,
 * audit requirements, DAO voting, timelock execution, and immutable clause
 * protection. Constitutional changes require supermajority + extended review.
 */

import type {
  AmendmentProposal,
  AmendmentProcessRules,
  AmendmentType,
  AmendmentStatus,
  ConstitutionEvent,
  ConstitutionEventCallback,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface AmendmentProcessManager {
  // Rules access
  getProcessRules(): AmendmentProcessRules;
  getImmutableClauses(): string[];

  // Amendment proposals
  proposeAmendment(input: ProposeAmendmentInput): AmendmentProposal;
  getAmendment(id: string): AmendmentProposal | undefined;
  getAllAmendments(): AmendmentProposal[];
  getAmendmentsByStatus(status: AmendmentStatus): AmendmentProposal[];

  // Lifecycle management
  startCommunityReview(amendmentId: string, authorizedBy: string): AmendmentProposal;
  completeAudit(amendmentId: string, auditReport: string, authorizedBy: string): AmendmentProposal;
  startVoting(amendmentId: string, authorizedBy: string): AmendmentProposal;
  castVote(amendmentId: string, voter: string, vote: 'for' | 'against' | 'abstain', power: number): AmendmentProposal;
  concludeVoting(amendmentId: string): AmendmentProposal;
  enactAmendment(amendmentId: string, authorizedBy: string): AmendmentProposal;
  rejectAmendment(amendmentId: string, reason: string, authorizedBy: string): AmendmentProposal;
  withdrawAmendment(amendmentId: string, proposerAddress: string): AmendmentProposal;

  // Validation
  canAmend(clause: string): boolean;
  getRequiredThreshold(amendmentType: AmendmentType): { quorum: number; approval: number };

  // Events
  onEvent(callback: ConstitutionEventCallback): () => void;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface ProposeAmendmentInput {
  amendmentType: AmendmentType;
  title: string;
  rationale: string;
  proposerAddress: string;
  targetSection: string;
  currentText: string;
  proposedText: string;
  impactAssessment: string;
}

// ============================================================================
// Default Amendment Rules
// ============================================================================

const DEFAULT_IMMUTABLE_CLAUSES: string[] = [
  'Token holders retain the right to exit the protocol at any time',
  'No single entity shall control more than 33% of total governance voting power',
  'AI systems shall never have unilateral authority over treasury confiscation',
  'AI systems shall never override a valid DAO supermajority vote',
  'The insurance reserve absolute floor shall never fall below 2% of TVL',
  'Emergency powers shall always auto-expire and cannot be made permanent',
  'All on-chain governance actions shall be publicly auditable',
];

const DEFAULT_VOTING_PERIOD_BY_TYPE: Record<AmendmentType, number> = {
  standard_parameter: 7,
  structural: 14,
  constitutional: 21,
  emergency_clause: 14,
};

const DEFAULT_TIMELOCK_BY_TYPE: Record<AmendmentType, number> = {
  standard_parameter: 2,
  structural: 7,
  constitutional: 14,
  emergency_clause: 3,
};

const DEFAULT_APPROVAL_BY_TYPE: Record<AmendmentType, number> = {
  standard_parameter: 51,
  structural: 66,
  constitutional: 75,
  emergency_clause: 66,
};

const DEFAULT_QUORUM_BY_TYPE: Record<AmendmentType, number> = {
  standard_parameter: 10,
  structural: 15,
  constitutional: 20,
  emergency_clause: 15,
};

const DEFAULT_AMENDMENT_RULES: Omit<AmendmentProcessRules, 'id' | 'adoptedAt' | 'updatedAt'> = {
  version: '1.0.0',
  communityReviewPeriodDays: 14,
  auditRequiredForTypes: ['constitutional', 'structural'],
  auditWindowDays: 30,
  votingPeriodByType: DEFAULT_VOTING_PERIOD_BY_TYPE,
  timelockByType: DEFAULT_TIMELOCK_BY_TYPE,
  approvalThresholdByType: DEFAULT_APPROVAL_BY_TYPE,
  quorumByType: DEFAULT_QUORUM_BY_TYPE,
  immutableClauses: DEFAULT_IMMUTABLE_CLAUSES,
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultAmendmentProcessManager implements AmendmentProcessManager {
  private rules: AmendmentProcessRules;
  private readonly amendments = new Map<string, AmendmentProposal>();
  private readonly votes = new Map<string, Map<string, { vote: string; power: number }>>();
  private readonly eventCallbacks: ConstitutionEventCallback[] = [];

  constructor(rulesOverrides?: Partial<AmendmentProcessRules>) {
    const now = new Date();
    this.rules = {
      id: this.generateId(),
      ...DEFAULT_AMENDMENT_RULES,
      adoptedAt: now,
      updatedAt: now,
      ...rulesOverrides,
    };
  }

  // --------------------------------------------------------------------------
  // Rules Access
  // --------------------------------------------------------------------------

  getProcessRules(): AmendmentProcessRules {
    return { ...this.rules };
  }

  getImmutableClauses(): string[] {
    return [...this.rules.immutableClauses];
  }

  // --------------------------------------------------------------------------
  // Amendment Proposals
  // --------------------------------------------------------------------------

  proposeAmendment(input: ProposeAmendmentInput): AmendmentProposal {
    // Check if target section contains an immutable clause
    if (!this.canAmend(input.currentText)) {
      throw new Error(
        `Cannot amend immutable clause: "${input.currentText.slice(0, 80)}..."`
      );
    }

    const now = new Date();
    const requiresAudit = this.rules.auditRequiredForTypes.includes(input.amendmentType);
    const thresholds = this.getRequiredThreshold(input.amendmentType);

    const amendment: AmendmentProposal = {
      id: this.generateId(),
      amendmentType: input.amendmentType,
      status: 'draft',
      title: input.title,
      rationale: input.rationale,
      proposerAddress: input.proposerAddress,
      targetSection: input.targetSection,
      currentText: input.currentText,
      proposedText: input.proposedText,
      impactAssessment: input.impactAssessment,
      requiredApprovalThreshold: thresholds.approval,
      requiredQuorum: thresholds.quorum,
      createdAt: now,
      updatedAt: now,
    };

    this.amendments.set(amendment.id, amendment);
    this.votes.set(amendment.id, new Map());

    this.emit({
      type: 'amendment.proposed',
      data: {
        amendmentId: amendment.id,
        amendmentType: input.amendmentType,
        targetSection: input.targetSection,
        proposer: input.proposerAddress,
        requiresAudit,
      },
      timestamp: now,
    });

    return amendment;
  }

  getAmendment(id: string): AmendmentProposal | undefined {
    return this.amendments.get(id);
  }

  getAllAmendments(): AmendmentProposal[] {
    return Array.from(this.amendments.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getAmendmentsByStatus(status: AmendmentStatus): AmendmentProposal[] {
    return Array.from(this.amendments.values())
      .filter(a => a.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // --------------------------------------------------------------------------
  // Lifecycle Management
  // --------------------------------------------------------------------------

  startCommunityReview(amendmentId: string, authorizedBy: string): AmendmentProposal {
    const amendment = this.getAmendmentOrThrow(amendmentId);
    this.assertStatus(amendment, 'draft');
    if (!authorizedBy) throw new Error('Authorization required');

    const now = new Date();
    const reviewEnd = new Date(now.getTime() + this.rules.communityReviewPeriodDays * 24 * 3600 * 1000);

    const updated: AmendmentProposal = {
      ...amendment,
      status: 'community_review',
      communityReviewStartAt: now,
      communityReviewEndAt: reviewEnd,
      updatedAt: now,
    };

    this.amendments.set(amendmentId, updated);
    return updated;
  }

  completeAudit(amendmentId: string, auditReport: string, authorizedBy: string): AmendmentProposal {
    const amendment = this.getAmendmentOrThrow(amendmentId);
    this.assertStatus(amendment, 'audit_pending');
    if (!authorizedBy) throw new Error('Authorization required');
    if (!auditReport || auditReport.length < 10) throw new Error('Audit report must be provided');

    const updated: AmendmentProposal = {
      ...amendment,
      status: 'audit_complete',
      auditReport,
      updatedAt: new Date(),
    };

    this.amendments.set(amendmentId, updated);
    return updated;
  }

  startVoting(amendmentId: string, authorizedBy: string): AmendmentProposal {
    const amendment = this.getAmendmentOrThrow(amendmentId);

    // Can start voting after community_review or audit_complete
    if (amendment.status !== 'community_review' && amendment.status !== 'audit_complete') {
      throw new Error(
        `Cannot start voting from status '${amendment.status}'. Must be 'community_review' or 'audit_complete'`
      );
    }

    // If audit was required and not complete, block
    if (this.rules.auditRequiredForTypes.includes(amendment.amendmentType) && amendment.status !== 'audit_complete') {
      throw new Error(`Audit is required for ${amendment.amendmentType} amendments before voting`);
    }

    if (!authorizedBy) throw new Error('Authorization required');

    const now = new Date();
    const periodDays = this.rules.votingPeriodByType[amendment.amendmentType];
    const votingEnd = new Date(now.getTime() + periodDays * 24 * 3600 * 1000);

    const updated: AmendmentProposal = {
      ...amendment,
      status: 'voting',
      votingStartAt: now,
      votingEndAt: votingEnd,
      updatedAt: now,
    };

    this.amendments.set(amendmentId, updated);
    return updated;
  }

  castVote(
    amendmentId: string,
    voter: string,
    vote: 'for' | 'against' | 'abstain',
    power: number
  ): AmendmentProposal {
    const amendment = this.getAmendmentOrThrow(amendmentId);
    this.assertStatus(amendment, 'voting');
    if (power <= 0) throw new Error('Voting power must be positive');

    const voterMap = this.votes.get(amendmentId)!;
    if (voterMap.has(voter)) {
      throw new Error(`${voter} has already voted on amendment ${amendmentId}`);
    }

    voterMap.set(voter, { vote, power });

    const totals = this.computeVoteTotals(amendmentId);
    const updated: AmendmentProposal = {
      ...amendment,
      ...totals,
      updatedAt: new Date(),
    };

    this.amendments.set(amendmentId, updated);
    return updated;
  }

  concludeVoting(amendmentId: string): AmendmentProposal {
    const amendment = this.getAmendmentOrThrow(amendmentId);
    this.assertStatus(amendment, 'voting');

    const totals = this.computeVoteTotals(amendmentId);
    const totalVotes = totals.forVotes + totals.againstVotes + totals.abstainVotes;
    const forPercent = totalVotes > 0 ? (totals.forVotes / totalVotes) * 100 : 0;

    // Check if passed (simplified — in production would check against total supply for quorum)
    const passed = forPercent >= amendment.requiredApprovalThreshold && totalVotes > 0;

    if (!passed) {
      const updated: AmendmentProposal = {
        ...amendment,
        ...totals,
        status: 'rejected',
        updatedAt: new Date(),
      };
      this.amendments.set(amendmentId, updated);
      this.emit({ type: 'amendment.rejected', data: { amendmentId }, timestamp: new Date() });
      return updated;
    }

    // Move to timelock
    const now = new Date();
    const timelockDays = this.rules.timelockByType[amendment.amendmentType];
    const timelockEnd = new Date(now.getTime() + timelockDays * 24 * 3600 * 1000);

    const updated: AmendmentProposal = {
      ...amendment,
      ...totals,
      status: 'timelock',
      timelockEndAt: timelockEnd,
      updatedAt: now,
    };
    this.amendments.set(amendmentId, updated);
    return updated;
  }

  enactAmendment(amendmentId: string, authorizedBy: string): AmendmentProposal {
    const amendment = this.getAmendmentOrThrow(amendmentId);
    this.assertStatus(amendment, 'timelock');
    if (!authorizedBy) throw new Error('Authorization required');

    const now = new Date();
    if (amendment.timelockEndAt && amendment.timelockEndAt > now) {
      throw new Error(`Timelock not expired. Ends at: ${amendment.timelockEndAt.toISOString()}`);
    }

    const updated: AmendmentProposal = {
      ...amendment,
      status: 'enacted',
      enactedAt: now,
      updatedAt: now,
    };
    this.amendments.set(amendmentId, updated);

    this.emit({
      type: 'amendment.enacted',
      data: { amendmentId, targetSection: amendment.targetSection, authorizedBy },
      timestamp: now,
    });

    return updated;
  }

  rejectAmendment(amendmentId: string, reason: string, authorizedBy: string): AmendmentProposal {
    const amendment = this.getAmendmentOrThrow(amendmentId);
    if (['enacted', 'withdrawn'].includes(amendment.status)) {
      throw new Error(`Cannot reject amendment in '${amendment.status}' status`);
    }
    if (!authorizedBy) throw new Error('Authorization required');

    const updated: AmendmentProposal = {
      ...amendment,
      status: 'rejected',
      rationale: `${amendment.rationale}\n\nRejection reason: ${reason}`,
      updatedAt: new Date(),
    };
    this.amendments.set(amendmentId, updated);

    this.emit({ type: 'amendment.rejected', data: { amendmentId, reason, authorizedBy }, timestamp: new Date() });
    return updated;
  }

  withdrawAmendment(amendmentId: string, proposerAddress: string): AmendmentProposal {
    const amendment = this.getAmendmentOrThrow(amendmentId);
    if (amendment.proposerAddress !== proposerAddress) {
      throw new Error('Only the proposer can withdraw an amendment');
    }
    if (['enacted', 'rejected', 'withdrawn'].includes(amendment.status)) {
      throw new Error(`Cannot withdraw amendment in '${amendment.status}' status`);
    }

    const updated: AmendmentProposal = {
      ...amendment,
      status: 'withdrawn',
      updatedAt: new Date(),
    };
    this.amendments.set(amendmentId, updated);
    return updated;
  }

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  canAmend(clause: string): boolean {
    return !this.rules.immutableClauses.some(
      immutable => clause.includes(immutable) || immutable.includes(clause)
    );
  }

  getRequiredThreshold(amendmentType: AmendmentType): { quorum: number; approval: number } {
    return {
      quorum: this.rules.quorumByType[amendmentType],
      approval: this.rules.approvalThresholdByType[amendmentType],
    };
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  onEvent(callback: ConstitutionEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx !== -1) this.eventCallbacks.splice(idx, 1);
    };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private getAmendmentOrThrow(id: string): AmendmentProposal {
    const amendment = this.amendments.get(id);
    if (!amendment) throw new Error(`Amendment ${id} not found`);
    return amendment;
  }

  private assertStatus(amendment: AmendmentProposal, expected: AmendmentStatus): void {
    if (amendment.status !== expected) {
      throw new Error(`Expected status '${expected}', got '${amendment.status}'`);
    }
  }

  private computeVoteTotals(amendmentId: string): { forVotes: number; againstVotes: number; abstainVotes: number } {
    const voterMap = this.votes.get(amendmentId) ?? new Map();
    let forVotes = 0;
    let againstVotes = 0;
    let abstainVotes = 0;

    for (const { vote, power } of voterMap.values()) {
      if (vote === 'for') forVotes += power;
      else if (vote === 'against') againstVotes += power;
      else abstainVotes += power;
    }

    return { forVotes, againstVotes, abstainVotes };
  }

  private emit(event: ConstitutionEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }

  private generateId(): string {
    return `ap-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function createAmendmentProcessManager(
  rulesOverrides?: Partial<AmendmentProcessRules>
): DefaultAmendmentProcessManager {
  return new DefaultAmendmentProcessManager(rulesOverrides);
}
