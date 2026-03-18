/**
 * TONAIAgent - Institutional Governance
 *
 * Manages institutional governance including governance structure management,
 * advisory board management, committee management (risk, compliance, investment, etc.),
 * policy management, voting mechanisms, and decision logging and tracking.
 */

import {
  InstitutionalGovernance,
  GovernanceStructure,
  GovernanceTier,
  DecisionAuthority,
  AdvisoryBoard,
  AdvisoryMember,
  BoardResolution,
  GovernanceCommittee,
  CommitteeType,
  CommitteeMember,
  CommitteeDecision,
  GovernancePolicy,
  PolicyCategory,
  VotingMechanism,
  VotingResult,
  GovernanceDecision,
  VetoRight,
  InstitutionalGovernanceConfig,
  InstitutionalNetworkEvent,
  InstitutionalNetworkEventCallback,
} from './types';

// ============================================================================
// Interfaces
// ============================================================================

export interface InstitutionalGovernanceManager {
  // Governance initialization and retrieval
  initializeGovernance(networkId: string, structure: GovernanceStructureConfig): Promise<InstitutionalGovernance>;
  getGovernance(networkId: string): Promise<InstitutionalGovernance | null>;
  updateGovernanceStructure(networkId: string, updates: GovernanceStructureUpdates): Promise<InstitutionalGovernance>;

  // Advisory board management
  createAdvisoryBoard(config: CreateAdvisoryBoardRequest): Promise<AdvisoryBoard>;
  getAdvisoryBoard(boardId: string): Promise<AdvisoryBoard | null>;
  updateAdvisoryBoard(boardId: string, updates: AdvisoryBoardUpdates): Promise<AdvisoryBoard>;
  addAdvisoryMember(boardId: string, member: Omit<AdvisoryMember, 'id'>): Promise<AdvisoryMember>;
  updateAdvisoryMember(boardId: string, memberId: string, updates: Partial<AdvisoryMember>): Promise<AdvisoryMember>;
  removeAdvisoryMember(boardId: string, memberId: string, reason?: string): Promise<void>;
  recordBoardResolution(boardId: string, resolution: Omit<BoardResolution, 'id'>): Promise<BoardResolution>;
  updateBoardResolution(boardId: string, resolutionId: string, updates: Partial<BoardResolution>): Promise<BoardResolution>;

  // Committee management
  createCommittee(config: CreateCommitteeRequest): Promise<GovernanceCommittee>;
  getCommittee(committeeId: string): Promise<GovernanceCommittee | null>;
  listCommittees(filters?: CommitteeFilters): Promise<GovernanceCommittee[]>;
  updateCommittee(committeeId: string, updates: CommitteeUpdates): Promise<GovernanceCommittee>;
  dissolveCommittee(committeeId: string, reason: string): Promise<void>;
  addCommitteeMember(committeeId: string, member: Omit<CommitteeMember, 'id'>): Promise<CommitteeMember>;
  updateCommitteeMember(committeeId: string, memberId: string, updates: Partial<CommitteeMember>): Promise<CommitteeMember>;
  removeCommitteeMember(committeeId: string, memberId: string, reason?: string): Promise<void>;
  recordCommitteeDecision(committeeId: string, decision: Omit<CommitteeDecision, 'id' | 'committeeId'>): Promise<CommitteeDecision>;
  updateCommitteeDecision(committeeId: string, decisionId: string, updates: Partial<CommitteeDecision>): Promise<CommitteeDecision>;

  // Policy management
  createPolicy(policy: CreatePolicyRequest): Promise<GovernancePolicy>;
  getPolicy(policyId: string): Promise<GovernancePolicy | null>;
  listPolicies(filters?: PolicyFilters): Promise<GovernancePolicy[]>;
  updatePolicy(policyId: string, updates: PolicyUpdates): Promise<GovernancePolicy>;
  submitPolicyForReview(policyId: string): Promise<GovernancePolicy>;
  approvePolicy(policyId: string, approver: string, notes?: string): Promise<GovernancePolicy>;
  rejectPolicy(policyId: string, rejector: string, reason: string): Promise<GovernancePolicy>;
  activatePolicy(policyId: string): Promise<GovernancePolicy>;
  retirePolicy(policyId: string, reason?: string): Promise<GovernancePolicy>;
  getPoliciesDueForReview(daysAhead: number): Promise<PolicyReviewAlert[]>;

  // Voting mechanisms
  createVotingMechanism(config: CreateVotingMechanismRequest): Promise<VotingMechanism>;
  getVotingMechanism(mechanismId: string): Promise<VotingMechanism | null>;
  listVotingMechanisms(): Promise<VotingMechanism[]>;
  updateVotingMechanism(mechanismId: string, updates: VotingMechanismUpdates): Promise<VotingMechanism>;
  deleteVotingMechanism(mechanismId: string): Promise<void>;

  // Voting operations
  initiateVote(mechanismId: string, proposal: VoteProposal): Promise<ActiveVote>;
  getActiveVotes(): Promise<ActiveVote[]>;
  getVote(voteId: string): Promise<ActiveVote | null>;
  castVote(voteId: string, voterId: string, decision: VoteDecision, reason?: string): Promise<VoteCast>;
  tallyVotes(voteId: string): Promise<VotingResult>;
  closeVote(voteId: string): Promise<ActiveVote>;
  vetoVote(voteId: string, vetoer: string, reason: string): Promise<ActiveVote>;

  // Decision logging and tracking
  logDecision(decision: Omit<GovernanceDecision, 'id'>): Promise<GovernanceDecision>;
  getDecision(decisionId: string): Promise<GovernanceDecision | null>;
  getDecisionLog(filters?: DecisionLogFilters): Promise<GovernanceDecision[]>;
  updateDecision(decisionId: string, updates: Partial<GovernanceDecision>): Promise<GovernanceDecision>;
  implementDecision(decisionId: string, implementedBy: string, documentation?: string): Promise<GovernanceDecision>;

  // Governance analytics and health
  getGovernanceHealth(): GovernanceHealthReport;
  getGovernanceMetrics(networkId: string): Promise<GovernanceMetrics>;
  getComplianceStatus(networkId: string): Promise<GovernanceComplianceStatus>;

  // Event handling
  onEvent(callback: InstitutionalNetworkEventCallback): void;
}

export interface GovernanceStructureConfig {
  type: 'centralized' | 'decentralized' | 'hybrid';
  tiers: Omit<GovernanceTier, 'members'>[];
  decisionAuthority: DecisionAuthority[];
  escalationPath: string[];
}

export interface GovernanceStructureUpdates {
  type?: 'centralized' | 'decentralized' | 'hybrid';
  tiers?: Partial<GovernanceTier>[];
  decisionAuthority?: DecisionAuthority[];
  escalationPath?: string[];
}

export interface CreateAdvisoryBoardRequest {
  name: string;
  purpose: string;
  meetingFrequency: string;
  charter?: string;
  initialMembers?: Omit<AdvisoryMember, 'id'>[];
}

export interface AdvisoryBoardUpdates {
  name?: string;
  purpose?: string;
  meetingFrequency?: string;
  charter?: string;
  lastMeetingDate?: Date;
  nextMeetingDate?: Date;
}

export interface CreateCommitteeRequest {
  name: string;
  type: CommitteeType;
  purpose: string;
  charter: string;
  meetingFrequency: string;
  initialMembers?: Omit<CommitteeMember, 'id'>[];
}

export interface CommitteeFilters {
  types?: CommitteeType[];
  statuses?: ('active' | 'dissolved')[];
  hasDecisions?: boolean;
  limit?: number;
  offset?: number;
}

export interface CommitteeUpdates {
  name?: string;
  purpose?: string;
  charter?: string;
  meetingFrequency?: string;
  lastMeetingDate?: Date;
}

export interface CreatePolicyRequest {
  name: string;
  category: PolicyCategory;
  content: string;
  owner: string;
  complianceRequired: boolean;
  reviewFrequency: string;
  attachments?: string[];
  relatedPolicies?: string[];
}

export interface PolicyFilters {
  categories?: PolicyCategory[];
  statuses?: GovernancePolicy['status'][];
  owners?: string[];
  complianceRequired?: boolean;
  effectiveBefore?: Date;
  effectiveAfter?: Date;
  limit?: number;
  offset?: number;
}

export interface PolicyUpdates {
  name?: string;
  category?: PolicyCategory;
  content?: string;
  owner?: string;
  complianceRequired?: boolean;
  reviewFrequency?: string;
  attachments?: string[];
  relatedPolicies?: string[];
}

export interface PolicyReviewAlert {
  policyId: string;
  policyName: string;
  category: PolicyCategory;
  owner: string;
  nextReviewDate: Date;
  daysUntilReview: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CreateVotingMechanismRequest {
  name: string;
  type: VotingMechanism['type'];
  applicableTo: string[];
  quorumRequirement: number;
  threshold: number;
  votingPeriod: number;
  tieBreaker?: string;
  vetoRights?: VetoRight[];
}

export interface VotingMechanismUpdates {
  name?: string;
  applicableTo?: string[];
  quorumRequirement?: number;
  threshold?: number;
  votingPeriod?: number;
  tieBreaker?: string;
  vetoRights?: VetoRight[];
}

export interface VoteProposal {
  title: string;
  description: string;
  type: string;
  proposedBy: string;
  options?: string[];
  attachments?: string[];
  impact?: string;
}

export interface ActiveVote {
  id: string;
  mechanismId: string;
  proposal: VoteProposal;
  status: 'pending' | 'active' | 'closed' | 'vetoed' | 'expired';
  startedAt: Date;
  endsAt: Date;
  closedAt?: Date;
  votes: VoteCast[];
  result?: VotingResult;
  vetoedBy?: string;
  vetoReason?: string;
}

export type VoteDecision = 'for' | 'against' | 'abstain';

export interface VoteCast {
  voterId: string;
  voterName?: string;
  decision: VoteDecision;
  weight: number;
  reason?: string;
  castedAt: Date;
}

export interface DecisionLogFilters {
  types?: string[];
  statuses?: GovernanceDecision['status'][];
  initiatedBy?: string[];
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GovernanceHealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  overallScore: number;
  metrics: {
    activeCommittees: number;
    activePolicies: number;
    pendingDecisions: number;
    pendingVotes: number;
    overdueReviews: number;
  };
  issues: GovernanceIssue[];
  lastAssessedAt: Date;
}

export interface GovernanceIssue {
  category: 'committee' | 'policy' | 'voting' | 'compliance' | 'structure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendedAction: string;
}

export interface GovernanceMetrics {
  networkId: string;
  period: string;
  committees: {
    total: number;
    active: number;
    decisionsThisPeriod: number;
    averageAttendance: number;
  };
  policies: {
    total: number;
    active: number;
    drafts: number;
    retired: number;
    updatedThisPeriod: number;
  };
  voting: {
    totalVotes: number;
    passedVotes: number;
    failedVotes: number;
    averageParticipation: number;
    averageTimeToDecision: number;
  };
  decisions: {
    total: number;
    implemented: number;
    pending: number;
    rejected: number;
  };
  lastUpdatedAt: Date;
}

export interface GovernanceComplianceStatus {
  networkId: string;
  overallStatus: 'compliant' | 'partially_compliant' | 'non_compliant';
  policyCompliance: {
    totalPolicies: number;
    compliantPolicies: number;
    policiesNeedingReview: number;
    expiredPolicies: number;
  };
  committeeCompliance: {
    committeesWithCharter: number;
    committeesWithQuorum: number;
    regularyMeetingCommittees: number;
  };
  votingCompliance: {
    votesWithQuorum: number;
    totalVotes: number;
  };
  issues: ComplianceIssue[];
  assessedAt: Date;
}

export interface ComplianceIssue {
  type: string;
  entity: string;
  entityId: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: string;
  dueDate?: Date;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultInstitutionalGovernanceManager implements InstitutionalGovernanceManager {
  private governances: Map<string, InstitutionalGovernance> = new Map();
  private advisoryBoards: Map<string, AdvisoryBoard> = new Map();
  private committees: Map<string, GovernanceCommittee> = new Map();
  private policies: Map<string, GovernancePolicy> = new Map();
  private votingMechanisms: Map<string, VotingMechanism> = new Map();
  private activeVotes: Map<string, ActiveVote> = new Map();
  private decisions: Map<string, GovernanceDecision> = new Map();
  private eventCallbacks: InstitutionalNetworkEventCallback[] = [];
  private config: InstitutionalGovernanceConfig;

  constructor(config?: Partial<InstitutionalGovernanceConfig>) {
    this.config = {
      enabled: true,
      advisoryBoardEnabled: true,
      committeesEnabled: true,
      votingEnabled: true,
      policyManagementEnabled: true,
      ...config,
    };
  }

  getConfig(): InstitutionalGovernanceConfig {
    return this.config;
  }

  // ============================================================================
  // Governance Initialization and Retrieval
  // ============================================================================

  async initializeGovernance(
    networkId: string,
    structure: GovernanceStructureConfig
  ): Promise<InstitutionalGovernance> {
    const governanceId = this.generateId('governance');

    const governanceStructure: GovernanceStructure = {
      type: structure.type,
      tiers: structure.tiers.map((tier) => ({
        ...tier,
        members: [],
      })),
      decisionAuthority: structure.decisionAuthority,
      escalationPath: structure.escalationPath,
    };

    const governance: InstitutionalGovernance = {
      id: governanceId,
      networkId,
      structure: governanceStructure,
      advisoryBoard: {
        id: this.generateId('board'),
        name: 'Default Advisory Board',
        purpose: 'Strategic advisory for the institutional network',
        members: [],
        meetingFrequency: 'quarterly',
        resolutions: [],
      },
      committees: [],
      policies: [],
      votingMechanisms: [],
      decisionLog: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.governances.set(networkId, governance);
    this.advisoryBoards.set(governance.advisoryBoard.id, governance.advisoryBoard);

    this.emitEvent('governance_decision', 'governance', governanceId, 'initialize', {
      networkId,
      structureType: structure.type,
    });

    return governance;
  }

  async getGovernance(networkId: string): Promise<InstitutionalGovernance | null> {
    return this.governances.get(networkId) || null;
  }

  async updateGovernanceStructure(
    networkId: string,
    updates: GovernanceStructureUpdates
  ): Promise<InstitutionalGovernance> {
    const governance = this.governances.get(networkId);
    if (!governance) {
      throw new Error(`Governance not found for network: ${networkId}`);
    }

    if (updates.type) {
      governance.structure.type = updates.type;
    }
    if (updates.tiers) {
      governance.structure.tiers = updates.tiers.map((tier, index) => ({
        ...governance.structure.tiers[index],
        ...tier,
      }));
    }
    if (updates.decisionAuthority) {
      governance.structure.decisionAuthority = updates.decisionAuthority;
    }
    if (updates.escalationPath) {
      governance.structure.escalationPath = updates.escalationPath;
    }

    governance.updatedAt = new Date();
    this.governances.set(networkId, governance);

    this.emitEvent('governance_decision', 'governance', governance.id, 'update_structure', updates as unknown as Record<string, unknown>);

    return governance;
  }

  // ============================================================================
  // Advisory Board Management
  // ============================================================================

  async createAdvisoryBoard(config: CreateAdvisoryBoardRequest): Promise<AdvisoryBoard> {
    const boardId = this.generateId('board');

    const board: AdvisoryBoard = {
      id: boardId,
      name: config.name,
      purpose: config.purpose,
      members: [],
      meetingFrequency: config.meetingFrequency,
      charter: config.charter,
      resolutions: [],
    };

    // Add initial members if provided
    if (config.initialMembers) {
      for (const memberData of config.initialMembers) {
        const member: AdvisoryMember = {
          id: this.generateId('advisory_member'),
          ...memberData,
        };
        board.members.push(member);
      }
    }

    this.advisoryBoards.set(boardId, board);
    this.emitEvent('governance_decision', 'governance', boardId, 'create_advisory_board', { name: config.name });

    return board;
  }

  async getAdvisoryBoard(boardId: string): Promise<AdvisoryBoard | null> {
    return this.advisoryBoards.get(boardId) || null;
  }

  async updateAdvisoryBoard(boardId: string, updates: AdvisoryBoardUpdates): Promise<AdvisoryBoard> {
    const board = this.advisoryBoards.get(boardId);
    if (!board) {
      throw new Error(`Advisory board not found: ${boardId}`);
    }

    Object.assign(board, updates);
    this.advisoryBoards.set(boardId, board);

    return board;
  }

  async addAdvisoryMember(boardId: string, member: Omit<AdvisoryMember, 'id'>): Promise<AdvisoryMember> {
    const board = this.advisoryBoards.get(boardId);
    if (!board) {
      throw new Error(`Advisory board not found: ${boardId}`);
    }

    const newMember: AdvisoryMember = {
      id: this.generateId('advisory_member'),
      ...member,
    };

    board.members.push(newMember);
    this.advisoryBoards.set(boardId, board);

    this.emitEvent('governance_decision', 'governance', boardId, 'add_advisory_member', {
      memberId: newMember.id,
      memberName: newMember.name,
    });

    return newMember;
  }

  async updateAdvisoryMember(
    boardId: string,
    memberId: string,
    updates: Partial<AdvisoryMember>
  ): Promise<AdvisoryMember> {
    const board = this.advisoryBoards.get(boardId);
    if (!board) {
      throw new Error(`Advisory board not found: ${boardId}`);
    }

    const memberIndex = board.members.findIndex((m) => m.id === memberId);
    if (memberIndex === -1) {
      throw new Error(`Advisory member not found: ${memberId}`);
    }

    board.members[memberIndex] = { ...board.members[memberIndex], ...updates };
    this.advisoryBoards.set(boardId, board);

    return board.members[memberIndex];
  }

  async removeAdvisoryMember(boardId: string, memberId: string, reason?: string): Promise<void> {
    const board = this.advisoryBoards.get(boardId);
    if (!board) {
      throw new Error(`Advisory board not found: ${boardId}`);
    }

    const member = board.members.find((m) => m.id === memberId);
    if (!member) {
      throw new Error(`Advisory member not found: ${memberId}`);
    }

    board.members = board.members.filter((m) => m.id !== memberId);
    this.advisoryBoards.set(boardId, board);

    this.emitEvent('governance_decision', 'governance', boardId, 'remove_advisory_member', {
      memberId,
      memberName: member.name,
      reason,
    });
  }

  async recordBoardResolution(
    boardId: string,
    resolution: Omit<BoardResolution, 'id'>
  ): Promise<BoardResolution> {
    const board = this.advisoryBoards.get(boardId);
    if (!board) {
      throw new Error(`Advisory board not found: ${boardId}`);
    }

    const newResolution: BoardResolution = {
      id: this.generateId('resolution'),
      ...resolution,
    };

    board.resolutions.push(newResolution);
    this.advisoryBoards.set(boardId, board);

    this.emitEvent('governance_decision', 'governance', boardId, 'record_board_resolution', {
      resolutionId: newResolution.id,
      title: newResolution.title,
      type: newResolution.type,
    });

    return newResolution;
  }

  async updateBoardResolution(
    boardId: string,
    resolutionId: string,
    updates: Partial<BoardResolution>
  ): Promise<BoardResolution> {
    const board = this.advisoryBoards.get(boardId);
    if (!board) {
      throw new Error(`Advisory board not found: ${boardId}`);
    }

    const resolutionIndex = board.resolutions.findIndex((r) => r.id === resolutionId);
    if (resolutionIndex === -1) {
      throw new Error(`Resolution not found: ${resolutionId}`);
    }

    board.resolutions[resolutionIndex] = { ...board.resolutions[resolutionIndex], ...updates };
    this.advisoryBoards.set(boardId, board);

    return board.resolutions[resolutionIndex];
  }

  // ============================================================================
  // Committee Management
  // ============================================================================

  async createCommittee(config: CreateCommitteeRequest): Promise<GovernanceCommittee> {
    const committeeId = this.generateId('committee');

    const committee: GovernanceCommittee = {
      id: committeeId,
      name: config.name,
      type: config.type,
      purpose: config.purpose,
      members: [],
      charter: config.charter,
      meetingFrequency: config.meetingFrequency,
      decisions: [],
      status: 'active',
    };

    // Add initial members if provided
    if (config.initialMembers) {
      for (const memberData of config.initialMembers) {
        const member: CommitteeMember = {
          id: this.generateId('committee_member'),
          ...memberData,
        };
        committee.members.push(member);
      }
    }

    this.committees.set(committeeId, committee);
    this.emitEvent('governance_decision', 'governance', committeeId, 'create_committee', {
      name: config.name,
      type: config.type,
    });

    return committee;
  }

  async getCommittee(committeeId: string): Promise<GovernanceCommittee | null> {
    return this.committees.get(committeeId) || null;
  }

  async listCommittees(filters?: CommitteeFilters): Promise<GovernanceCommittee[]> {
    let committees = Array.from(this.committees.values());

    if (filters) {
      if (filters.types?.length) {
        committees = committees.filter((c) => filters.types!.includes(c.type));
      }
      if (filters.statuses?.length) {
        committees = committees.filter((c) => filters.statuses!.includes(c.status));
      }
      if (filters.hasDecisions !== undefined) {
        committees = committees.filter(
          (c) => (c.decisions.length > 0) === filters.hasDecisions
        );
      }

      // Pagination
      if (filters.offset !== undefined) {
        committees = committees.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        committees = committees.slice(0, filters.limit);
      }
    }

    return committees;
  }

  async updateCommittee(committeeId: string, updates: CommitteeUpdates): Promise<GovernanceCommittee> {
    const committee = this.committees.get(committeeId);
    if (!committee) {
      throw new Error(`Committee not found: ${committeeId}`);
    }

    Object.assign(committee, updates);
    this.committees.set(committeeId, committee);

    return committee;
  }

  async dissolveCommittee(committeeId: string, reason: string): Promise<void> {
    const committee = this.committees.get(committeeId);
    if (!committee) {
      throw new Error(`Committee not found: ${committeeId}`);
    }

    committee.status = 'dissolved';
    this.committees.set(committeeId, committee);

    this.emitEvent('governance_decision', 'governance', committeeId, 'dissolve_committee', {
      name: committee.name,
      reason,
    });
  }

  async addCommitteeMember(
    committeeId: string,
    member: Omit<CommitteeMember, 'id'>
  ): Promise<CommitteeMember> {
    const committee = this.committees.get(committeeId);
    if (!committee) {
      throw new Error(`Committee not found: ${committeeId}`);
    }

    const newMember: CommitteeMember = {
      id: this.generateId('committee_member'),
      ...member,
    };

    committee.members.push(newMember);
    this.committees.set(committeeId, committee);

    this.emitEvent('governance_decision', 'governance', committeeId, 'add_committee_member', {
      memberId: newMember.id,
      memberName: newMember.name,
      role: newMember.role,
    });

    return newMember;
  }

  async updateCommitteeMember(
    committeeId: string,
    memberId: string,
    updates: Partial<CommitteeMember>
  ): Promise<CommitteeMember> {
    const committee = this.committees.get(committeeId);
    if (!committee) {
      throw new Error(`Committee not found: ${committeeId}`);
    }

    const memberIndex = committee.members.findIndex((m) => m.id === memberId);
    if (memberIndex === -1) {
      throw new Error(`Committee member not found: ${memberId}`);
    }

    committee.members[memberIndex] = { ...committee.members[memberIndex], ...updates };
    this.committees.set(committeeId, committee);

    return committee.members[memberIndex];
  }

  async removeCommitteeMember(committeeId: string, memberId: string, reason?: string): Promise<void> {
    const committee = this.committees.get(committeeId);
    if (!committee) {
      throw new Error(`Committee not found: ${committeeId}`);
    }

    const member = committee.members.find((m) => m.id === memberId);
    if (!member) {
      throw new Error(`Committee member not found: ${memberId}`);
    }

    committee.members = committee.members.filter((m) => m.id !== memberId);
    this.committees.set(committeeId, committee);

    this.emitEvent('governance_decision', 'governance', committeeId, 'remove_committee_member', {
      memberId,
      memberName: member.name,
      reason,
    });
  }

  async recordCommitteeDecision(
    committeeId: string,
    decision: Omit<CommitteeDecision, 'id' | 'committeeId'>
  ): Promise<CommitteeDecision> {
    const committee = this.committees.get(committeeId);
    if (!committee) {
      throw new Error(`Committee not found: ${committeeId}`);
    }

    const newDecision: CommitteeDecision = {
      id: this.generateId('committee_decision'),
      committeeId,
      ...decision,
    };

    committee.decisions.push(newDecision);
    this.committees.set(committeeId, committee);

    this.emitEvent('governance_decision', 'governance', committeeId, 'record_committee_decision', {
      decisionId: newDecision.id,
      title: newDecision.title,
      category: newDecision.category,
      impact: newDecision.impact,
    });

    return newDecision;
  }

  async updateCommitteeDecision(
    committeeId: string,
    decisionId: string,
    updates: Partial<CommitteeDecision>
  ): Promise<CommitteeDecision> {
    const committee = this.committees.get(committeeId);
    if (!committee) {
      throw new Error(`Committee not found: ${committeeId}`);
    }

    const decisionIndex = committee.decisions.findIndex((d) => d.id === decisionId);
    if (decisionIndex === -1) {
      throw new Error(`Committee decision not found: ${decisionId}`);
    }

    committee.decisions[decisionIndex] = { ...committee.decisions[decisionIndex], ...updates };
    this.committees.set(committeeId, committee);

    return committee.decisions[decisionIndex];
  }

  // ============================================================================
  // Policy Management
  // ============================================================================

  async createPolicy(policy: CreatePolicyRequest): Promise<GovernancePolicy> {
    const policyId = this.generateId('policy');

    const newPolicy: GovernancePolicy = {
      id: policyId,
      name: policy.name,
      category: policy.category,
      version: '1.0',
      status: 'draft',
      owner: policy.owner,
      content: policy.content,
      attachments: policy.attachments,
      relatedPolicies: policy.relatedPolicies,
      complianceRequired: policy.complianceRequired,
      reviewFrequency: policy.reviewFrequency,
    };

    this.policies.set(policyId, newPolicy);
    this.emitEvent('governance_decision', 'governance', policyId, 'create_policy', {
      name: policy.name,
      category: policy.category,
    });

    return newPolicy;
  }

  async getPolicy(policyId: string): Promise<GovernancePolicy | null> {
    return this.policies.get(policyId) || null;
  }

  async listPolicies(filters?: PolicyFilters): Promise<GovernancePolicy[]> {
    let policies = Array.from(this.policies.values());

    if (filters) {
      if (filters.categories?.length) {
        policies = policies.filter((p) => filters.categories!.includes(p.category));
      }
      if (filters.statuses?.length) {
        policies = policies.filter((p) => filters.statuses!.includes(p.status));
      }
      if (filters.owners?.length) {
        policies = policies.filter((p) => filters.owners!.includes(p.owner));
      }
      if (filters.complianceRequired !== undefined) {
        policies = policies.filter((p) => p.complianceRequired === filters.complianceRequired);
      }
      if (filters.effectiveBefore) {
        policies = policies.filter(
          (p) => p.effectiveDate && p.effectiveDate <= filters.effectiveBefore!
        );
      }
      if (filters.effectiveAfter) {
        policies = policies.filter(
          (p) => p.effectiveDate && p.effectiveDate >= filters.effectiveAfter!
        );
      }

      // Pagination
      if (filters.offset !== undefined) {
        policies = policies.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        policies = policies.slice(0, filters.limit);
      }
    }

    return policies;
  }

  async updatePolicy(policyId: string, updates: PolicyUpdates): Promise<GovernancePolicy> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    // If content is updated, increment version
    if (updates.content && updates.content !== policy.content) {
      const versionParts = policy.version.split('.');
      const minorVersion = parseInt(versionParts[1] || '0', 10) + 1;
      policy.version = `${versionParts[0]}.${minorVersion}`;
    }

    Object.assign(policy, updates);
    this.policies.set(policyId, policy);

    this.emitEvent('governance_decision', 'governance', policyId, 'update_policy', {
      name: policy.name,
      version: policy.version,
    });

    return policy;
  }

  async submitPolicyForReview(policyId: string): Promise<GovernancePolicy> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    if (policy.status !== 'draft') {
      throw new Error(`Policy must be in draft status to submit for review. Current status: ${policy.status}`);
    }

    policy.status = 'review';
    this.policies.set(policyId, policy);

    this.emitEvent('governance_decision', 'governance', policyId, 'submit_policy_for_review', {
      name: policy.name,
    });

    return policy;
  }

  async approvePolicy(policyId: string, approver: string, notes?: string): Promise<GovernancePolicy> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    if (policy.status !== 'review') {
      throw new Error(`Policy must be in review status to approve. Current status: ${policy.status}`);
    }

    policy.status = 'approved';
    policy.approvedBy = approver;
    this.policies.set(policyId, policy);

    this.emitEvent('governance_decision', 'governance', policyId, 'approve_policy', {
      name: policy.name,
      approver,
      notes,
    });

    return policy;
  }

  async rejectPolicy(policyId: string, rejector: string, reason: string): Promise<GovernancePolicy> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    policy.status = 'draft';
    this.policies.set(policyId, policy);

    this.emitEvent('governance_decision', 'governance', policyId, 'reject_policy', {
      name: policy.name,
      rejector,
      reason,
    });

    return policy;
  }

  async activatePolicy(policyId: string): Promise<GovernancePolicy> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    if (policy.status !== 'approved') {
      throw new Error(`Policy must be approved before activation. Current status: ${policy.status}`);
    }

    policy.status = 'active';
    policy.effectiveDate = new Date();
    policy.lastReviewDate = new Date();

    // Calculate next review date based on review frequency
    const reviewMonths = this.parseReviewFrequency(policy.reviewFrequency);
    policy.nextReviewDate = new Date(Date.now() + reviewMonths * 30 * 24 * 60 * 60 * 1000);

    this.policies.set(policyId, policy);

    this.emitEvent('governance_decision', 'governance', policyId, 'activate_policy', {
      name: policy.name,
      effectiveDate: policy.effectiveDate,
    });

    return policy;
  }

  async retirePolicy(policyId: string, reason?: string): Promise<GovernancePolicy> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    policy.status = 'retired';
    policy.expiryDate = new Date();
    this.policies.set(policyId, policy);

    this.emitEvent('governance_decision', 'governance', policyId, 'retire_policy', {
      name: policy.name,
      reason,
    });

    return policy;
  }

  async getPoliciesDueForReview(daysAhead: number): Promise<PolicyReviewAlert[]> {
    const alerts: PolicyReviewAlert[] = [];
    const cutoffDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    for (const policy of this.policies.values()) {
      if (policy.status === 'active' && policy.nextReviewDate && policy.nextReviewDate <= cutoffDate) {
        const daysUntilReview = Math.ceil(
          (policy.nextReviewDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        );

        alerts.push({
          policyId: policy.id,
          policyName: policy.name,
          category: policy.category,
          owner: policy.owner,
          nextReviewDate: policy.nextReviewDate,
          daysUntilReview,
          severity:
            daysUntilReview <= 7
              ? 'critical'
              : daysUntilReview <= 14
              ? 'high'
              : daysUntilReview <= 30
              ? 'medium'
              : 'low',
        });
      }
    }

    return alerts.sort((a, b) => a.daysUntilReview - b.daysUntilReview);
  }

  // ============================================================================
  // Voting Mechanisms
  // ============================================================================

  async createVotingMechanism(config: CreateVotingMechanismRequest): Promise<VotingMechanism> {
    const mechanismId = this.generateId('voting_mechanism');

    const mechanism: VotingMechanism = {
      id: mechanismId,
      name: config.name,
      type: config.type,
      applicableTo: config.applicableTo,
      quorumRequirement: config.quorumRequirement,
      threshold: config.threshold,
      votingPeriod: config.votingPeriod,
      tieBreaker: config.tieBreaker,
      vetoRights: config.vetoRights,
    };

    this.votingMechanisms.set(mechanismId, mechanism);
    this.emitEvent('governance_decision', 'governance', mechanismId, 'create_voting_mechanism', {
      name: config.name,
      type: config.type,
    });

    return mechanism;
  }

  async getVotingMechanism(mechanismId: string): Promise<VotingMechanism | null> {
    return this.votingMechanisms.get(mechanismId) || null;
  }

  async listVotingMechanisms(): Promise<VotingMechanism[]> {
    return Array.from(this.votingMechanisms.values());
  }

  async updateVotingMechanism(
    mechanismId: string,
    updates: VotingMechanismUpdates
  ): Promise<VotingMechanism> {
    const mechanism = this.votingMechanisms.get(mechanismId);
    if (!mechanism) {
      throw new Error(`Voting mechanism not found: ${mechanismId}`);
    }

    Object.assign(mechanism, updates);
    this.votingMechanisms.set(mechanismId, mechanism);

    return mechanism;
  }

  async deleteVotingMechanism(mechanismId: string): Promise<void> {
    if (!this.votingMechanisms.has(mechanismId)) {
      throw new Error(`Voting mechanism not found: ${mechanismId}`);
    }

    this.votingMechanisms.delete(mechanismId);
  }

  // ============================================================================
  // Voting Operations
  // ============================================================================

  async initiateVote(mechanismId: string, proposal: VoteProposal): Promise<ActiveVote> {
    const mechanism = this.votingMechanisms.get(mechanismId);
    if (!mechanism) {
      throw new Error(`Voting mechanism not found: ${mechanismId}`);
    }

    const voteId = this.generateId('vote');
    const now = new Date();
    const endsAt = new Date(now.getTime() + mechanism.votingPeriod * 60 * 60 * 1000);

    const vote: ActiveVote = {
      id: voteId,
      mechanismId,
      proposal,
      status: 'active',
      startedAt: now,
      endsAt,
      votes: [],
    };

    this.activeVotes.set(voteId, vote);
    this.emitEvent('governance_vote', 'governance', voteId, 'initiate_vote', {
      title: proposal.title,
      mechanismId,
      proposedBy: proposal.proposedBy,
    });

    return vote;
  }

  async getActiveVotes(): Promise<ActiveVote[]> {
    return Array.from(this.activeVotes.values()).filter((v) => v.status === 'active');
  }

  async getVote(voteId: string): Promise<ActiveVote | null> {
    return this.activeVotes.get(voteId) || null;
  }

  async castVote(
    voteId: string,
    voterId: string,
    decision: VoteDecision,
    reason?: string
  ): Promise<VoteCast> {
    const vote = this.activeVotes.get(voteId);
    if (!vote) {
      throw new Error(`Vote not found: ${voteId}`);
    }

    if (vote.status !== 'active') {
      throw new Error(`Vote is not active. Current status: ${vote.status}`);
    }

    if (new Date() > vote.endsAt) {
      throw new Error('Voting period has ended');
    }

    // Check if voter has already voted
    const existingVote = vote.votes.find((v) => v.voterId === voterId);
    if (existingVote) {
      throw new Error('Voter has already cast a vote');
    }

    const voteCast: VoteCast = {
      voterId,
      decision,
      weight: 1, // Default weight, could be customized based on voting mechanism
      reason,
      castedAt: new Date(),
    };

    vote.votes.push(voteCast);
    this.activeVotes.set(voteId, vote);

    this.emitEvent('governance_vote', 'governance', voteId, 'cast_vote', {
      voterId,
      decision,
    });

    return voteCast;
  }

  async tallyVotes(voteId: string): Promise<VotingResult> {
    const vote = this.activeVotes.get(voteId);
    if (!vote) {
      throw new Error(`Vote not found: ${voteId}`);
    }

    const mechanism = this.votingMechanisms.get(vote.mechanismId);
    if (!mechanism) {
      throw new Error(`Voting mechanism not found: ${vote.mechanismId}`);
    }

    let votesFor = 0;
    let votesAgainst = 0;
    let abstentions = 0;

    for (const v of vote.votes) {
      switch (v.decision) {
        case 'for':
          votesFor += v.weight;
          break;
        case 'against':
          votesAgainst += v.weight;
          break;
        case 'abstain':
          abstentions += v.weight;
          break;
      }
    }

    const totalVotes = votesFor + votesAgainst + abstentions;
    const quorumMet = totalVotes >= mechanism.quorumRequirement;

    let thresholdMet = false;
    let outcome: VotingResult['outcome'] = 'failed';

    if (quorumMet) {
      const validVotes = votesFor + votesAgainst;
      if (validVotes > 0) {
        const forPercentage = votesFor / validVotes;
        thresholdMet = forPercentage >= mechanism.threshold;

        if (votesFor > votesAgainst) {
          outcome = thresholdMet ? 'passed' : 'failed';
        } else if (votesFor === votesAgainst) {
          outcome = 'tied';
        } else {
          outcome = 'failed';
        }
      }
    }

    const result: VotingResult = {
      votesFor,
      votesAgainst,
      abstentions,
      quorumMet,
      thresholdMet,
      outcome,
      votedAt: new Date(),
    };

    vote.result = result;
    this.activeVotes.set(voteId, vote);

    return result;
  }

  async closeVote(voteId: string): Promise<ActiveVote> {
    const vote = this.activeVotes.get(voteId);
    if (!vote) {
      throw new Error(`Vote not found: ${voteId}`);
    }

    if (vote.status !== 'active') {
      throw new Error(`Vote is not active. Current status: ${vote.status}`);
    }

    // Tally votes before closing
    const result = await this.tallyVotes(voteId);

    vote.status = 'closed';
    vote.closedAt = new Date();
    vote.result = result;

    this.activeVotes.set(voteId, vote);

    this.emitEvent('governance_vote', 'governance', voteId, 'close_vote', {
      title: vote.proposal.title,
      outcome: result.outcome,
      votesFor: result.votesFor,
      votesAgainst: result.votesAgainst,
    });

    return vote;
  }

  async vetoVote(voteId: string, vetoer: string, reason: string): Promise<ActiveVote> {
    const vote = this.activeVotes.get(voteId);
    if (!vote) {
      throw new Error(`Vote not found: ${voteId}`);
    }

    const mechanism = this.votingMechanisms.get(vote.mechanismId);
    if (!mechanism) {
      throw new Error(`Voting mechanism not found: ${vote.mechanismId}`);
    }

    // Check if vetoer has veto rights
    const hasVetoRight = mechanism.vetoRights?.some((v) => v.holder === vetoer);
    if (!hasVetoRight) {
      throw new Error(`${vetoer} does not have veto rights for this vote`);
    }

    vote.status = 'vetoed';
    vote.vetoedBy = vetoer;
    vote.vetoReason = reason;
    vote.closedAt = new Date();

    this.activeVotes.set(voteId, vote);

    this.emitEvent('governance_vote', 'governance', voteId, 'veto_vote', {
      title: vote.proposal.title,
      vetoer,
      reason,
    });

    return vote;
  }

  // ============================================================================
  // Decision Logging and Tracking
  // ============================================================================

  async logDecision(decision: Omit<GovernanceDecision, 'id'>): Promise<GovernanceDecision> {
    const decisionId = this.generateId('decision');

    const newDecision: GovernanceDecision = {
      id: decisionId,
      ...decision,
    };

    this.decisions.set(decisionId, newDecision);
    this.emitEvent('governance_decision', 'governance', decisionId, 'log_decision', {
      title: decision.title,
      type: decision.type,
      status: decision.status,
    });

    return newDecision;
  }

  async getDecision(decisionId: string): Promise<GovernanceDecision | null> {
    return this.decisions.get(decisionId) || null;
  }

  async getDecisionLog(filters?: DecisionLogFilters): Promise<GovernanceDecision[]> {
    let decisions = Array.from(this.decisions.values());

    if (filters) {
      if (filters.types?.length) {
        decisions = decisions.filter((d) => filters.types!.includes(d.type));
      }
      if (filters.statuses?.length) {
        decisions = decisions.filter((d) => filters.statuses!.includes(d.status));
      }
      if (filters.initiatedBy?.length) {
        decisions = decisions.filter((d) => filters.initiatedBy!.includes(d.initiatedBy));
      }
      if (filters.fromDate) {
        decisions = decisions.filter((d) => d.initiatedAt >= filters.fromDate!);
      }
      if (filters.toDate) {
        decisions = decisions.filter((d) => d.initiatedAt <= filters.toDate!);
      }

      // Sorting
      if (filters.sortBy) {
        decisions.sort((a, b) => {
          const aVal = this.getNestedValue(a, filters.sortBy!);
          const bVal = this.getNestedValue(b, filters.sortBy!);
          const order = filters.sortOrder === 'desc' ? -1 : 1;
          return aVal > bVal ? order : aVal < bVal ? -order : 0;
        });
      }

      // Pagination
      if (filters.offset !== undefined) {
        decisions = decisions.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        decisions = decisions.slice(0, filters.limit);
      }
    }

    return decisions;
  }

  async updateDecision(
    decisionId: string,
    updates: Partial<GovernanceDecision>
  ): Promise<GovernanceDecision> {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new Error(`Decision not found: ${decisionId}`);
    }

    Object.assign(decision, updates);
    this.decisions.set(decisionId, decision);

    return decision;
  }

  async implementDecision(
    decisionId: string,
    implementedBy: string,
    documentation?: string
  ): Promise<GovernanceDecision> {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new Error(`Decision not found: ${decisionId}`);
    }

    decision.status = 'implemented';
    decision.implementedAt = new Date();
    decision.implementedBy = implementedBy;
    if (documentation) {
      decision.documentation = documentation;
    }

    this.decisions.set(decisionId, decision);

    this.emitEvent('governance_decision', 'governance', decisionId, 'implement_decision', {
      title: decision.title,
      implementedBy,
    });

    return decision;
  }

  // ============================================================================
  // Governance Analytics and Health
  // ============================================================================

  getGovernanceHealth(): GovernanceHealthReport {
    const issues: GovernanceIssue[] = [];

    // Check active committees
    const activeCommittees = Array.from(this.committees.values()).filter(
      (c) => c.status === 'active'
    ).length;

    // Check active policies
    const activePolicies = Array.from(this.policies.values()).filter(
      (p) => p.status === 'active'
    ).length;

    // Check pending decisions
    const pendingDecisions = Array.from(this.decisions.values()).filter(
      (d) => d.status === 'pending' || d.status === 'voting'
    ).length;

    // Check pending votes
    const pendingVotes = Array.from(this.activeVotes.values()).filter(
      (v) => v.status === 'active'
    ).length;

    // Check overdue policy reviews
    const now = new Date();
    let overdueReviews = 0;
    for (const policy of this.policies.values()) {
      if (policy.status === 'active' && policy.nextReviewDate && policy.nextReviewDate < now) {
        overdueReviews++;
        issues.push({
          category: 'policy',
          severity: 'high',
          description: `Policy "${policy.name}" is overdue for review`,
          recommendedAction: 'Schedule policy review immediately',
        });
      }
    }

    // Check committees without members
    for (const committee of this.committees.values()) {
      if (committee.status === 'active' && committee.members.length === 0) {
        issues.push({
          category: 'committee',
          severity: 'medium',
          description: `Committee "${committee.name}" has no members`,
          recommendedAction: 'Assign members to the committee',
        });
      }
    }

    // Check expired votes
    for (const vote of this.activeVotes.values()) {
      if (vote.status === 'active' && new Date() > vote.endsAt) {
        issues.push({
          category: 'voting',
          severity: 'medium',
          description: `Vote "${vote.proposal.title}" has expired without being closed`,
          recommendedAction: 'Close the expired vote and tally results',
        });
      }
    }

    // Calculate overall score (0-100)
    let overallScore = 100;
    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          overallScore -= 20;
          break;
        case 'high':
          overallScore -= 10;
          break;
        case 'medium':
          overallScore -= 5;
          break;
        case 'low':
          overallScore -= 2;
          break;
      }
    }
    overallScore = Math.max(0, overallScore);

    let status: GovernanceHealthReport['status'] = 'healthy';
    if (overallScore < 50) {
      status = 'unhealthy';
    } else if (overallScore < 80) {
      status = 'degraded';
    }

    return {
      status,
      overallScore,
      metrics: {
        activeCommittees,
        activePolicies,
        pendingDecisions,
        pendingVotes,
        overdueReviews,
      },
      issues,
      lastAssessedAt: new Date(),
    };
  }

  async getGovernanceMetrics(networkId: string): Promise<GovernanceMetrics> {
    const committees = Array.from(this.committees.values());
    const policies = Array.from(this.policies.values());
    const votes = Array.from(this.activeVotes.values());
    const decisions = Array.from(this.decisions.values());

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Committee metrics
    const activeCommittees = committees.filter((c) => c.status === 'active').length;
    const decisionsThisPeriod = committees.reduce((sum, c) => {
      return sum + c.decisions.filter((d) => d.proposedAt >= thirtyDaysAgo).length;
    }, 0);

    // Policy metrics
    const activePoliciesCount = policies.filter((p) => p.status === 'active').length;
    const draftPolicies = policies.filter((p) => p.status === 'draft').length;
    const retiredPolicies = policies.filter((p) => p.status === 'retired').length;
    const policiesUpdatedThisPeriod = policies.filter(
      (p) => p.lastReviewDate && p.lastReviewDate >= thirtyDaysAgo
    ).length;

    // Voting metrics
    const closedVotes = votes.filter((v) => v.status === 'closed' && v.result);
    const passedVotes = closedVotes.filter((v) => v.result?.outcome === 'passed').length;
    const failedVotes = closedVotes.filter((v) => v.result?.outcome === 'failed').length;

    let totalParticipation = 0;
    let totalTimeToDecision = 0;
    for (const vote of closedVotes) {
      if (vote.votes.length > 0) {
        totalParticipation += vote.votes.length;
      }
      if (vote.closedAt && vote.startedAt) {
        totalTimeToDecision += vote.closedAt.getTime() - vote.startedAt.getTime();
      }
    }
    const averageParticipation = closedVotes.length > 0 ? totalParticipation / closedVotes.length : 0;
    const averageTimeToDecision =
      closedVotes.length > 0
        ? totalTimeToDecision / closedVotes.length / (1000 * 60 * 60) // Convert to hours
        : 0;

    // Decision metrics
    const implementedDecisions = decisions.filter((d) => d.status === 'implemented').length;
    const pendingDecisionsCount = decisions.filter(
      (d) => d.status === 'pending' || d.status === 'voting'
    ).length;
    const rejectedDecisions = decisions.filter((d) => d.status === 'rejected').length;

    return {
      networkId,
      period: '30d',
      committees: {
        total: committees.length,
        active: activeCommittees,
        decisionsThisPeriod,
        averageAttendance: 0, // Would need meeting attendance tracking
      },
      policies: {
        total: policies.length,
        active: activePoliciesCount,
        drafts: draftPolicies,
        retired: retiredPolicies,
        updatedThisPeriod: policiesUpdatedThisPeriod,
      },
      voting: {
        totalVotes: closedVotes.length,
        passedVotes,
        failedVotes,
        averageParticipation,
        averageTimeToDecision,
      },
      decisions: {
        total: decisions.length,
        implemented: implementedDecisions,
        pending: pendingDecisionsCount,
        rejected: rejectedDecisions,
      },
      lastUpdatedAt: new Date(),
    };
  }

  async getComplianceStatus(networkId: string): Promise<GovernanceComplianceStatus> {
    const issues: ComplianceIssue[] = [];
    const policies = Array.from(this.policies.values());
    const committees = Array.from(this.committees.values());
    const votes = Array.from(this.activeVotes.values()).filter((v) => v.status === 'closed');

    // Policy compliance
    const activePolicies = policies.filter((p) => p.status === 'active');
    const now = new Date();
    const policiesNeedingReview = activePolicies.filter(
      (p) => p.nextReviewDate && p.nextReviewDate <= now
    ).length;
    const expiredPolicies = policies.filter((p) => p.status === 'retired').length;

    for (const policy of activePolicies) {
      if (policy.nextReviewDate && policy.nextReviewDate <= now) {
        issues.push({
          type: 'policy_review_overdue',
          entity: 'policy',
          entityId: policy.id,
          description: `Policy "${policy.name}" is overdue for review`,
          severity: 'high',
          recommendedAction: 'Conduct policy review',
          dueDate: policy.nextReviewDate,
        });
      }
    }

    // Committee compliance
    const activeCommittees = committees.filter((c) => c.status === 'active');
    const committeesWithCharter = activeCommittees.filter((c) => c.charter && c.charter.length > 0).length;
    const committeesWithQuorum = activeCommittees.filter((c) => c.members.length >= 3).length;
    const regularlyMeetingCommittees = activeCommittees.filter((c) => c.lastMeetingDate).length;

    for (const committee of activeCommittees) {
      if (!committee.charter || committee.charter.length === 0) {
        issues.push({
          type: 'committee_charter_missing',
          entity: 'committee',
          entityId: committee.id,
          description: `Committee "${committee.name}" is missing a charter`,
          severity: 'medium',
          recommendedAction: 'Draft and approve committee charter',
        });
      }
      if (committee.members.length < 3) {
        issues.push({
          type: 'committee_insufficient_members',
          entity: 'committee',
          entityId: committee.id,
          description: `Committee "${committee.name}" has fewer than 3 members`,
          severity: 'medium',
          recommendedAction: 'Appoint additional committee members',
        });
      }
    }

    // Voting compliance
    const votesWithQuorum = votes.filter((v) => v.result?.quorumMet).length;

    // Determine overall status
    let overallStatus: GovernanceComplianceStatus['overallStatus'] = 'compliant';
    const criticalIssues = issues.filter((i) => i.severity === 'critical').length;
    const highIssues = issues.filter((i) => i.severity === 'high').length;

    if (criticalIssues > 0) {
      overallStatus = 'non_compliant';
    } else if (highIssues > 0 || issues.length > 3) {
      overallStatus = 'partially_compliant';
    }

    return {
      networkId,
      overallStatus,
      policyCompliance: {
        totalPolicies: policies.length,
        compliantPolicies: activePolicies.length - policiesNeedingReview,
        policiesNeedingReview,
        expiredPolicies,
      },
      committeeCompliance: {
        committeesWithCharter,
        committeesWithQuorum,
        regularyMeetingCommittees: regularlyMeetingCommittees,
      },
      votingCompliance: {
        votesWithQuorum,
        totalVotes: votes.length,
      },
      issues,
      assessedAt: new Date(),
    };
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  onEvent(callback: InstitutionalNetworkEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emitEvent(
    type: InstitutionalNetworkEvent['type'],
    category: InstitutionalNetworkEvent['category'],
    sourceId: string,
    action: string,
    details: Record<string, unknown>
  ): void {
    const event: InstitutionalNetworkEvent = {
      id: this.generateId('event'),
      timestamp: new Date(),
      type,
      category,
      severity: 'info',
      source: 'governance',
      sourceId,
      action,
      description: `${action} on ${sourceId}`,
      details,
      affectedEntities: [{ type: 'governance', id: sourceId, impact: 'direct' }],
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

  private parseReviewFrequency(frequency: string): number {
    const match = frequency.match(/^(\d+)\s*(month|year|quarter)s?$/i);
    if (!match) {
      return 12; // Default to 12 months
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'month':
        return value;
      case 'quarter':
        return value * 3;
      case 'year':
        return value * 12;
      default:
        return 12;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj) || 0;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createInstitutionalGovernanceManager(
  config?: Partial<InstitutionalGovernanceConfig>
): DefaultInstitutionalGovernanceManager {
  return new DefaultInstitutionalGovernanceManager(config);
}

// Default export
export default DefaultInstitutionalGovernanceManager;
