/**
 * TONAIAgent - Protocol Constitution: Governance Charter (Issue #126)
 *
 * Manages the multi-tier governance architecture: DAO token holders,
 * treasury council, risk oversight council, emergency stabilization committee,
 * and the AI advisory layer. Handles constitutional proposals and DAO voting.
 */

import type {
  GovernanceBody,
  GovernanceBodyType,
  VotingThreshold,
  ConstitutionalProposal,
  CreateConstitutionalProposalInput,
  ProposalLifecycleStage,
  ConstitutionEvent,
  ConstitutionEventCallback,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface GovernanceCharterManager {
  // Governance bodies
  getGovernanceBodies(): GovernanceBody[];
  getGovernanceBody(type: GovernanceBodyType): GovernanceBody | undefined;
  registerGovernanceBody(body: Omit<GovernanceBody, 'id' | 'establishedAt'>): GovernanceBody;
  updateVotingThreshold(bodyType: GovernanceBodyType, threshold: Partial<VotingThreshold>): GovernanceBody;

  // Constitutional proposals
  createProposal(input: CreateConstitutionalProposalInput): ConstitutionalProposal;
  getProposal(id: string): ConstitutionalProposal | undefined;
  getActiveProposals(): ConstitutionalProposal[];
  getPendingProposals(): ConstitutionalProposal[];
  advanceProposalStage(proposalId: string, authorizedBy: string): ConstitutionalProposal;
  castVote(proposalId: string, voter: string, vote: 'for' | 'against' | 'abstain', power: number): ConstitutionalProposal;
  applyAiAdvisory(proposalId: string, score: number, notes: string[]): ConstitutionalProposal;
  executeProposal(proposalId: string, authorizedBy: string): ConstitutionalProposal;

  // DAO parameter specification
  getDaoParameters(): DaoParameterSpec;
  updateDaoParameters(params: Partial<DaoParameterSpec>, authorizedBy: string): DaoParameterSpec;

  // Events
  onEvent(callback: ConstitutionEventCallback): () => void;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface DaoParameterSpec {
  minProposalThresholdTokens: number;   // Min tokens to submit proposal
  votingDelayBlocks: number;            // Blocks before voting opens
  standardVotingPeriodDays: number;     // Days for standard vote
  constitutionalVotingPeriodDays: number;
  standardTimelockDays: number;
  constitutionalTimelockDays: number;
  standardQuorumPercent: number;
  constitutionalQuorumPercent: number;
  standardApprovalPercent: number;
  constitutionalApprovalPercent: number;
  delegationEnabled: boolean;
  maxDelegationChainDepth: number;
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_GOVERNANCE_BODIES: Array<Omit<GovernanceBody, 'id' | 'establishedAt'>> = [
  {
    type: 'token_holder_dao',
    name: 'TONAI Token Holder DAO',
    description: 'All TONAI token holders participating in on-chain governance',
    votingThreshold: {
      quorumPercent: 10,
      approvalThreshold: 51,
      supermajorityThreshold: 75,
      timelockDays: 2,
      votingPeriodDays: 7,
    },
    authorities: [
      'Approve/reject all standard protocol proposals',
      'Elect treasury council members',
      'Elect risk oversight council members',
      'Ratify constitutional amendments',
      'Approve emergency stabilization committee composition',
    ],
    constraints: [
      'Cannot modify immutable constitutional clauses',
      'Cannot grant AI systems unconditional authority',
      'Cannot eliminate token holder voting rights',
    ],
    active: true,
  },
  {
    type: 'treasury_council',
    name: 'Treasury Management Council',
    description: 'Elected 5-member council managing treasury operations within DAO-approved parameters',
    memberCount: 5,
    electionPeriodDays: 180,
    votingThreshold: {
      quorumPercent: 60,
      approvalThreshold: 60,
      supermajorityThreshold: 80,
      timelockDays: 1,
      votingPeriodDays: 3,
    },
    authorities: [
      'Execute DAO-approved treasury allocations',
      'Manage day-to-day treasury operations within approved parameters',
      'Propose treasury-related governance proposals',
      'Authorize emergency treasury deployments up to approved limits',
    ],
    constraints: [
      'Cannot allocate beyond DAO-approved limits',
      'Cannot change risk parameters without risk council approval',
      'Subject to quarterly DAO review and removal',
    ],
    active: true,
  },
  {
    type: 'risk_oversight_council',
    name: 'Risk Oversight Council',
    description: 'Elected 5-member council overseeing all risk parameters and circuit breakers',
    memberCount: 5,
    electionPeriodDays: 180,
    votingThreshold: {
      quorumPercent: 60,
      approvalThreshold: 60,
      supermajorityThreshold: 80,
      timelockDays: 0,
      votingPeriodDays: 2,
    },
    authorities: [
      'Monitor protocol-wide risk metrics',
      'Adjust risk parameters within DAO-approved bounds',
      'Trigger circuit breakers in response to risk events',
      'Approve/reject high-risk strategy proposals',
      'Mandate portfolio rebalancing to reduce systemic exposure',
    ],
    constraints: [
      'Cannot set risk parameters outside constitutional hard limits',
      'Cannot approve strategies above maximum risk tier',
      'Subject to quarterly DAO review',
    ],
    active: true,
  },
  {
    type: 'emergency_stabilization',
    name: 'Emergency Stabilization Committee',
    description: '7-member committee with emergency response authority, auto-sunset powers',
    memberCount: 7,
    votingThreshold: {
      quorumPercent: 71,
      approvalThreshold: 71,
      supermajorityThreshold: 86,
      timelockDays: 0,
      votingPeriodDays: 0,  // Immediate action
    },
    authorities: [
      'Activate emergency protocol (trading halts, leverage freeze)',
      'Deploy emergency treasury reserves up to defined cap',
      'Pause governance temporarily during active attack',
      'Coordinate protocol migration in critical failure scenarios',
    ],
    constraints: [
      'All emergency activations auto-expire within 72 hours unless DAO ratifies',
      'Cannot confiscate user funds',
      'Cannot permanently disable governance',
      'All actions require post-emergency DAO review',
    ],
    active: true,
  },
  {
    type: 'ai_advisory_layer',
    name: 'AI Advisory Layer',
    description: 'AI systems providing analysis, scoring, and recommendations without binding vote authority',
    votingThreshold: {
      quorumPercent: 0,
      approvalThreshold: 0,
      supermajorityThreshold: 0,
      timelockDays: 0,
      votingPeriodDays: 0,
    },
    authorities: [
      'Analyze governance proposals and provide risk scores',
      'Flag proposals with constitutional conflicts',
      'Generate treasury rebalancing recommendations',
      'Monitor on-chain metrics and alert governance bodies',
    ],
    constraints: [
      'Advisory only — no binding vote on any proposal',
      'Cannot prevent DAO supermajority from executing',
      'Cannot autonomously execute treasury operations above defined bounds',
      'All AI actions are logged and auditable',
    ],
    active: true,
  },
];

const DEFAULT_DAO_PARAMETERS: DaoParameterSpec = {
  minProposalThresholdTokens: 1000,
  votingDelayBlocks: 13140,          // ~2 days
  standardVotingPeriodDays: 7,
  constitutionalVotingPeriodDays: 14,
  standardTimelockDays: 2,
  constitutionalTimelockDays: 7,
  standardQuorumPercent: 10,
  constitutionalQuorumPercent: 20,
  standardApprovalPercent: 51,
  constitutionalApprovalPercent: 75,
  delegationEnabled: true,
  maxDelegationChainDepth: 3,
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultGovernanceCharterManager implements GovernanceCharterManager {
  private readonly bodies = new Map<GovernanceBodyType, GovernanceBody>();
  private readonly proposals = new Map<string, ConstitutionalProposal>();
  private daoParameters: DaoParameterSpec;
  private readonly eventCallbacks: ConstitutionEventCallback[] = [];

  constructor(daoParams?: Partial<DaoParameterSpec>) {
    this.daoParameters = { ...DEFAULT_DAO_PARAMETERS, ...daoParams };

    // Initialize default governance bodies
    const now = new Date();
    for (const bodyDef of DEFAULT_GOVERNANCE_BODIES) {
      const body: GovernanceBody = {
        id: this.generateId(),
        ...bodyDef,
        establishedAt: now,
      };
      this.bodies.set(body.type, body);
    }
  }

  // --------------------------------------------------------------------------
  // Governance Bodies
  // --------------------------------------------------------------------------

  getGovernanceBodies(): GovernanceBody[] {
    return Array.from(this.bodies.values());
  }

  getGovernanceBody(type: GovernanceBodyType): GovernanceBody | undefined {
    return this.bodies.get(type);
  }

  registerGovernanceBody(body: Omit<GovernanceBody, 'id' | 'establishedAt'>): GovernanceBody {
    const existing = this.bodies.get(body.type);
    if (existing && existing.active) {
      throw new Error(`Governance body of type '${body.type}' already exists and is active`);
    }
    const newBody: GovernanceBody = {
      id: this.generateId(),
      ...body,
      establishedAt: new Date(),
    };
    this.bodies.set(newBody.type, newBody);
    this.emit({
      type: 'constitution.amended',
      data: { action: 'governance_body_registered', bodyType: body.type },
      timestamp: new Date(),
    });
    return newBody;
  }

  updateVotingThreshold(bodyType: GovernanceBodyType, threshold: Partial<VotingThreshold>): GovernanceBody {
    const body = this.bodies.get(bodyType);
    if (!body) throw new Error(`Governance body '${bodyType}' not found`);
    const updated: GovernanceBody = {
      ...body,
      votingThreshold: { ...body.votingThreshold, ...threshold },
    };
    this.bodies.set(bodyType, updated);
    return updated;
  }

  // --------------------------------------------------------------------------
  // Constitutional Proposals
  // --------------------------------------------------------------------------

  createProposal(input: CreateConstitutionalProposalInput): ConstitutionalProposal {
    const now = new Date();
    const isConstitutional = input.proposalType === 'constitutional';

    const proposal: ConstitutionalProposal = {
      id: this.generateId(),
      title: input.title,
      description: input.description,
      proposalType: input.proposalType,
      proposerAddress: input.proposerAddress,
      targetBody: input.targetBody,
      stage: 'draft',
      actions: input.actions,
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
      auditRequired: isConstitutional,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata,
    };

    this.proposals.set(proposal.id, proposal);
    this.emit({
      type: 'proposal.created',
      data: { proposalId: proposal.id, proposalType: input.proposalType, proposer: input.proposerAddress },
      timestamp: now,
    });

    return proposal;
  }

  getProposal(id: string): ConstitutionalProposal | undefined {
    return this.proposals.get(id);
  }

  getActiveProposals(): ConstitutionalProposal[] {
    return Array.from(this.proposals.values())
      .filter(p => p.stage === 'voting')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getPendingProposals(): ConstitutionalProposal[] {
    return Array.from(this.proposals.values())
      .filter(p => ['draft', 'review'].includes(p.stage))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  advanceProposalStage(proposalId: string, authorizedBy: string): ConstitutionalProposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);
    if (!authorizedBy) throw new Error('Authorization required');

    const stageFlow: Record<ProposalLifecycleStage, ProposalLifecycleStage | null> = {
      draft: 'review',
      review: proposal.auditRequired ? 'voting' : 'voting',  // Audit checked separately
      voting: 'timelock',
      timelock: 'executed',
      executed: null,
      rejected: null,
      withdrawn: null,
    };

    const nextStage = stageFlow[proposal.stage];
    if (!nextStage) throw new Error(`Proposal in terminal stage: ${proposal.stage}`);

    const now = new Date();
    const updated: ConstitutionalProposal = {
      ...proposal,
      stage: nextStage,
      updatedAt: now,
    };

    // Set timing when moving to voting
    if (nextStage === 'voting') {
      const daysForType = proposal.proposalType === 'constitutional'
        ? this.daoParameters.constitutionalVotingPeriodDays
        : this.daoParameters.standardVotingPeriodDays;
      updated.votingStartAt = now;
      updated.votingEndAt = new Date(now.getTime() + daysForType * 24 * 3600 * 1000);
    }

    // Set timelock when moving to timelock
    if (nextStage === 'timelock') {
      const timelockDays = proposal.proposalType === 'constitutional'
        ? this.daoParameters.constitutionalTimelockDays
        : this.daoParameters.standardTimelockDays;
      updated.timelockEndAt = new Date(now.getTime() + timelockDays * 24 * 3600 * 1000);
    }

    this.proposals.set(proposalId, updated);
    return updated;
  }

  castVote(
    proposalId: string,
    voter: string,
    vote: 'for' | 'against' | 'abstain',
    power: number
  ): ConstitutionalProposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);
    if (proposal.stage !== 'voting') {
      throw new Error(`Proposal ${proposalId} is not in voting stage (current: ${proposal.stage})`);
    }
    if (power <= 0) throw new Error('Voting power must be positive');

    const updated: ConstitutionalProposal = { ...proposal, updatedAt: new Date() };
    if (vote === 'for') updated.forVotes += power;
    else if (vote === 'against') updated.againstVotes += power;
    else updated.abstainVotes += power;

    this.proposals.set(proposalId, updated);

    this.emit({
      type: 'proposal.voted',
      data: { proposalId, voter, vote, power },
      timestamp: new Date(),
    });

    // Check if proposal has conclusively passed/failed
    this.checkProposalOutcome(updated);

    return this.proposals.get(proposalId)!;
  }

  applyAiAdvisory(proposalId: string, score: number, notes: string[]): ConstitutionalProposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);

    const updated: ConstitutionalProposal = {
      ...proposal,
      aiAdvisoryScore: Math.max(0, Math.min(100, score)),
      aiAdvisoryNotes: notes,
      updatedAt: new Date(),
    };

    this.proposals.set(proposalId, updated);
    this.emit({
      type: 'proposal.ai_advisory_complete',
      data: { proposalId, score, notesCount: notes.length },
      timestamp: new Date(),
    });

    return updated;
  }

  executeProposal(proposalId: string, authorizedBy: string): ConstitutionalProposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal ${proposalId} not found`);
    if (proposal.stage !== 'timelock') {
      throw new Error(`Proposal must be in timelock stage to execute (current: ${proposal.stage})`);
    }
    if (!authorizedBy) throw new Error('Authorization required');

    const now = new Date();
    if (proposal.timelockEndAt && proposal.timelockEndAt > now) {
      throw new Error(`Timelock has not expired yet. Ends at: ${proposal.timelockEndAt.toISOString()}`);
    }

    const updated: ConstitutionalProposal = {
      ...proposal,
      stage: 'executed',
      executedAt: now,
      updatedAt: now,
    };

    this.proposals.set(proposalId, updated);
    this.emit({
      type: 'proposal.executed',
      data: { proposalId, authorizedBy },
      timestamp: now,
    });

    return updated;
  }

  // --------------------------------------------------------------------------
  // DAO Parameters
  // --------------------------------------------------------------------------

  getDaoParameters(): DaoParameterSpec {
    return { ...this.daoParameters };
  }

  updateDaoParameters(params: Partial<DaoParameterSpec>, authorizedBy: string): DaoParameterSpec {
    if (!authorizedBy) throw new Error('Authorization required');
    this.daoParameters = { ...this.daoParameters, ...params };
    this.emit({
      type: 'constitution.amended',
      data: { section: 'dao_parameters', changedFields: Object.keys(params), authorizedBy },
      timestamp: new Date(),
    });
    return this.getDaoParameters();
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

  private checkProposalOutcome(proposal: ConstitutionalProposal): void {
    const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
    if (totalVotes === 0) return;

    const forPercent = (proposal.forVotes / totalVotes) * 100;
    const body = this.bodies.get(proposal.targetBody);
    if (!body) return;

    const threshold = proposal.proposalType === 'constitutional'
      ? body.votingThreshold.supermajorityThreshold
      : body.votingThreshold.approvalThreshold;

    // Check for conclusive defeat (can't possibly reach threshold)
    const remainingPercent = 100 - (totalVotes / (totalVotes + 1)) * 100; // approximate
    if (forPercent + remainingPercent < threshold && proposal.stage === 'voting') {
      const updated = { ...proposal, stage: 'rejected' as ProposalLifecycleStage, updatedAt: new Date() };
      this.proposals.set(proposal.id, updated);
      this.emit({ type: 'proposal.rejected', data: { proposalId: proposal.id }, timestamp: new Date() });
    }
  }

  private emit(event: ConstitutionEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }

  private generateId(): string {
    return `gc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function createGovernanceCharterManager(
  daoParams?: Partial<DaoParameterSpec>
): DefaultGovernanceCharterManager {
  return new DefaultGovernanceCharterManager(daoParams);
}
