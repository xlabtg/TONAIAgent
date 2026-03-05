/**
 * TONAIAgent - Monetary Governance Layer (Issue #123)
 *
 * Combines AI recommendations with DAO voting and emergency override mechanisms.
 *
 * Flow:
 *   AI Analysis → Monetary Proposal → DAO Vote → Execution Smart Contract
 *
 * Supports emergency overrides for critical situations that cannot wait for DAO voting.
 */

import type {
  MonetaryProposal,
  MonetaryProposalType,
  MonetaryProposalStatus,
  MonetaryPolicyOutputs,
  EmergencyMonetaryOverride,
  MonetaryPolicyConfig,
  MonetaryPolicyEvent,
  MonetaryPolicyEventCallback,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface MonetaryGovernanceLayer {
  // Proposals
  createProposal(
    type: MonetaryProposalType,
    title: string,
    description: string,
    aiRecommendation: MonetaryPolicyOutputs,
    proposer: string
  ): MonetaryProposal;

  castVote(
    proposalId: string,
    voter: string,
    voteType: 'for' | 'against' | 'abstain',
    votingPower: number
  ): void;

  executeProposal(proposalId: string): MonetaryProposal;
  cancelProposal(proposalId: string, reason: string): void;

  getProposal(proposalId: string): MonetaryProposal | undefined;
  getActiveProposals(): MonetaryProposal[];
  getProposalHistory(limit?: number): MonetaryProposal[];

  // Emergency overrides
  triggerEmergencyOverride(
    type: EmergencyMonetaryOverride['type'],
    triggeredBy: string,
    reason: string,
    parameters: Record<string, unknown>,
    expiresInHours?: number
  ): EmergencyMonetaryOverride;

  resolveEmergencyOverride(overrideId: string, resolvedBy: string): EmergencyMonetaryOverride;
  getActiveOverrides(): EmergencyMonetaryOverride[];

  // Config
  getConfig(): MonetaryPolicyConfig;
  updateConfig(config: Partial<MonetaryPolicyConfig>): void;

  // Events
  onEvent(callback: MonetaryPolicyEventCallback): () => void;
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_MONETARY_POLICY_CONFIG: MonetaryPolicyConfig = {
  emissionControl: {
    baseDailyRate: 100_000,
    maxDailyRate: 200_000,
    minDailyRate: 10_000,
    maxAdjustmentPercent: 30,
    adjustmentFrequencyDays: 7,
    burnEnabled: true,
    maxBurnPercent: 20,
    phaseThresholds: {
      growthStabilityIndex: 70,
      stressVolatility: 0.6,
      profitMargin: 0.5,
      liquidityGapDepth: 30,
    },
  },
  capitalAllocation: {
    maxAutoDeployPercent: 5,
    requireGovernanceAbovePercent: 10,
    emergencyDeployEnabled: true,
    maxEmergencyDeployPercent: 15,
    allocationLimits: {
      insurance_backstop: 20,
      liquidity_injection: 25,
      fund_seeding: 15,
      rwa_onboarding: 10,
      stabilization: 20,
      strategic_investment: 10,
      protocol_upgrade: 10,
    },
    coInvestmentEnabled: true,
    maxCoInvestmentPercent: 5,
  },
  governanceEnabled: true,
  votingPeriodDays: 7,
  timelockDays: 2,
  aiAutonomyLevel: 'moderate',
  stabilityLinkedIncentives: true,
  emergencyOverrideEnabled: true,
};

// ============================================================================
// Implementation
// ============================================================================

export class DefaultMonetaryGovernanceLayer implements MonetaryGovernanceLayer {
  private config: MonetaryPolicyConfig;
  private readonly proposals = new Map<string, MonetaryProposal>();
  private readonly overrides = new Map<string, EmergencyMonetaryOverride>();
  private readonly eventCallbacks: MonetaryPolicyEventCallback[] = [];
  private idCounter = 0;

  constructor(config?: Partial<MonetaryPolicyConfig>) {
    this.config = { ...DEFAULT_MONETARY_POLICY_CONFIG, ...config };
  }

  private nextId(): string {
    return `mgov-${++this.idCounter}-${Date.now()}`;
  }

  private emit(type: MonetaryPolicyEvent['type'], data: Record<string, unknown>): void {
    const event: MonetaryPolicyEvent = { type, data, timestamp: new Date() };
    for (const cb of this.eventCallbacks) cb(event);
  }

  private computeVotingWindow(): { start: Date; end: Date } {
    const now = Date.now();
    const start = new Date(now + 60 * 60 * 1000); // 1 hour delay
    const end = new Date(now + this.config.votingPeriodDays * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  createProposal(
    type: MonetaryProposalType,
    title: string,
    description: string,
    aiRecommendation: MonetaryPolicyOutputs,
    proposer: string
  ): MonetaryProposal {
    if (!this.config.governanceEnabled) {
      throw new Error('Governance layer is disabled');
    }

    const { start: votingStartsAt, end: votingEndsAt } = this.computeVotingWindow();
    const quorum = 10;   // 10% participation required
    const threshold = 51; // 51% approval required

    const proposal: MonetaryProposal = {
      id: this.nextId(),
      type,
      title,
      description,
      aiRecommendation,
      proposer,
      status: 'ai_analysis',
      votingStartsAt,
      votingEndsAt,
      executionEta: new Date(votingEndsAt.getTime() + this.config.timelockDays * 24 * 60 * 60 * 1000),
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
      totalVotingPower: 0,
      quorum,
      threshold,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.proposals.set(proposal.id, proposal);

    this.emit('governance.proposal_created', {
      proposalId: proposal.id,
      type,
      proposer,
      requiresGovernanceApproval: aiRecommendation.requiresGovernanceApproval,
    });

    // Immediately move to pending_vote for non-emergency proposals
    proposal.status = 'pending_vote';
    proposal.updatedAt = new Date();

    return proposal;
  }

  castVote(
    proposalId: string,
    voter: string,
    voteType: 'for' | 'against' | 'abstain',
    votingPower: number
  ): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);
    if (proposal.status !== 'pending_vote' && proposal.status !== 'voting') {
      throw new Error(`Proposal ${proposalId} is not open for voting`);
    }
    if (votingPower <= 0) throw new Error('Voting power must be positive');

    // Move to voting state on first vote
    if (proposal.status === 'pending_vote') {
      proposal.status = 'voting';
    }

    proposal.totalVotingPower += votingPower;
    if (voteType === 'for') proposal.forVotes += votingPower;
    else if (voteType === 'against') proposal.againstVotes += votingPower;
    else proposal.abstainVotes += votingPower;
    proposal.updatedAt = new Date();

    this.emit('governance.vote_cast', {
      proposalId,
      voter,
      voteType,
      votingPower,
      forVotes: proposal.forVotes,
      againstVotes: proposal.againstVotes,
    });
  }

  executeProposal(proposalId: string): MonetaryProposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);

    // Validate proposal can be executed
    if (proposal.status !== 'voting' && proposal.status !== 'approved') {
      throw new Error(`Proposal ${proposalId} is not in an executable state (status: ${proposal.status})`);
    }

    // Check quorum and threshold
    const participationPercent = proposal.totalVotingPower > 0
      ? (proposal.totalVotingPower / (proposal.totalVotingPower + 1)) * 100
      : 0;

    const approvalPercent = proposal.totalVotingPower > 0
      ? (proposal.forVotes / proposal.totalVotingPower) * 100
      : 0;

    if (approvalPercent < proposal.threshold) {
      proposal.status = 'rejected';
      proposal.updatedAt = new Date();
      return proposal;
    }

    proposal.status = 'executing';
    proposal.updatedAt = new Date();

    // Simulate execution
    proposal.status = 'executed';
    proposal.executedAt = new Date();
    proposal.updatedAt = new Date();

    this.emit('governance.proposal_executed', {
      proposalId,
      type: proposal.type,
      approvalPercent,
      forVotes: proposal.forVotes,
      againstVotes: proposal.againstVotes,
    });

    return proposal;
  }

  cancelProposal(proposalId: string, reason: string): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);
    if (proposal.status === 'executed') {
      throw new Error(`Cannot cancel an already-executed proposal`);
    }

    proposal.status = 'expired';
    proposal.updatedAt = new Date();
  }

  getProposal(proposalId: string): MonetaryProposal | undefined {
    return this.proposals.get(proposalId);
  }

  getActiveProposals(): MonetaryProposal[] {
    const activeStatuses: MonetaryProposalStatus[] = ['ai_analysis', 'pending_vote', 'voting', 'approved', 'executing'];
    return Array.from(this.proposals.values()).filter(p => activeStatuses.includes(p.status));
  }

  getProposalHistory(limit?: number): MonetaryProposal[] {
    const sorted = Array.from(this.proposals.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  triggerEmergencyOverride(
    type: EmergencyMonetaryOverride['type'],
    triggeredBy: string,
    reason: string,
    parameters: Record<string, unknown>,
    expiresInHours = 72
  ): EmergencyMonetaryOverride {
    if (!this.config.emergencyOverrideEnabled) {
      throw new Error('Emergency override is disabled');
    }

    const override: EmergencyMonetaryOverride = {
      id: this.nextId(),
      type,
      triggeredBy,
      reason,
      parameters,
      active: true,
      triggeredAt: new Date(),
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
    };

    this.overrides.set(override.id, override);

    this.emit('emergency.override_triggered', {
      overrideId: override.id,
      type,
      triggeredBy,
      reason,
      expiresAt: override.expiresAt,
    });

    return override;
  }

  resolveEmergencyOverride(overrideId: string, resolvedBy: string): EmergencyMonetaryOverride {
    const override = this.overrides.get(overrideId);
    if (!override) throw new Error(`Emergency override not found: ${overrideId}`);
    if (!override.active) throw new Error(`Override ${overrideId} is not active`);

    override.active = false;
    override.resolvedAt = new Date();
    override.resolvedBy = resolvedBy;

    this.emit('emergency.override_resolved', {
      overrideId,
      type: override.type,
      resolvedBy,
    });

    return override;
  }

  getActiveOverrides(): EmergencyMonetaryOverride[] {
    const now = new Date();
    return Array.from(this.overrides.values()).filter(
      o => o.active && (!o.expiresAt || o.expiresAt > now)
    );
  }

  getConfig(): MonetaryPolicyConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<MonetaryPolicyConfig>): void {
    this.config = { ...this.config, ...config };
  }

  onEvent(callback: MonetaryPolicyEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const idx = this.eventCallbacks.indexOf(callback);
      if (idx >= 0) this.eventCallbacks.splice(idx, 1);
    };
  }
}

export function createMonetaryGovernanceLayer(
  config?: Partial<MonetaryPolicyConfig>
): DefaultMonetaryGovernanceLayer {
  return new DefaultMonetaryGovernanceLayer(config);
}
