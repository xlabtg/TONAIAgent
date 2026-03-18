/**
 * TONAIAgent - Delegated & Institutional Governance (Issue #103)
 *
 * Institutional-grade governance with expert delegates, delegation systems,
 * and specialized voting authority for complex governance decisions.
 */

import type {
  InstitutionalDelegate,
  DelegateVotingRecord,
  DaoProposalType,
  DaoVoteType,
  DaoEvent,
  DaoEventCallback,
} from './types';

// ============================================================================
// Interface
// ============================================================================

export interface DelegatedGovernanceManager {
  // Delegate management
  registerDelegate(
    address: string,
    name: string,
    type: InstitutionalDelegate['type'],
    specializations: DaoProposalType[],
    tier: InstitutionalDelegate['tier']
  ): InstitutionalDelegate;

  getDelegate(address: string): InstitutionalDelegate | undefined;
  getAllDelegates(): InstitutionalDelegate[];
  getDelegatesBySpecialization(proposalType: DaoProposalType): InstitutionalDelegate[];
  deactivateDelegate(address: string): boolean;

  // Voting power management
  grantDelegatedPower(delegateAddress: string, power: number, fromAddress: string): void;
  revokeDelegatedPower(delegateAddress: string, fromAddress: string): void;

  // Voting record
  recordDelegateVote(
    address: string,
    proposalId: string,
    proposalType: DaoProposalType,
    vote: DaoVoteType,
    rationale?: string
  ): DelegateVotingRecord;

  getDelegateHistory(address: string): DelegateVotingRecord[];

  // Reputation
  updateDelegateReputation(address: string, delta: number, reason: string): void;
  getDelegateLeaderboard(): Array<{ delegate: InstitutionalDelegate; score: number }>;

  // Analytics
  getStats(): DelegatedGovernanceStats;

  // Events
  onEvent(callback: DaoEventCallback): () => void;
}

export interface DelegatedGovernanceStats {
  totalDelegates: number;
  activeDelegates: number;
  totalDelegatedPower: number;
  expertDelegates: number;
  institutionalDelegates: number;
  topDelegateByPower?: string;
  totalVotesCast: number;
}

// ============================================================================
// Implementation
// ============================================================================

export class DefaultDelegatedGovernanceManager implements DelegatedGovernanceManager {
  private readonly delegates = new Map<string, InstitutionalDelegate>();
  private readonly delegatedPowerFrom = new Map<string, Map<string, number>>();  // delegateAddr -> fromAddr -> power
  private readonly reputationLog: Array<{ address: string; delta: number; reason: string; at: Date }> = [];
  private readonly eventCallbacks: DaoEventCallback[] = [];

  // --------------------------------------------------------------------------
  // Delegate Management
  // --------------------------------------------------------------------------

  registerDelegate(
    address: string,
    name: string,
    type: InstitutionalDelegate['type'],
    specializations: DaoProposalType[],
    tier: InstitutionalDelegate['tier']
  ): InstitutionalDelegate {
    if (this.delegates.has(address)) {
      throw new Error(`Delegate ${address} is already registered`);
    }

    const delegate: InstitutionalDelegate = {
      id: this.generateId(),
      address,
      name,
      type,
      delegatedPower: 0,
      specializations,
      tier,
      reputation: 100,
      votingHistory: [],
      createdAt: new Date(),
      active: true,
    };

    this.delegates.set(address, delegate);
    this.delegatedPowerFrom.set(address, new Map());

    return delegate;
  }

  getDelegate(address: string): InstitutionalDelegate | undefined {
    return this.delegates.get(address);
  }

  getAllDelegates(): InstitutionalDelegate[] {
    return Array.from(this.delegates.values())
      .sort((a, b) => b.delegatedPower - a.delegatedPower);
  }

  getDelegatesBySpecialization(proposalType: DaoProposalType): InstitutionalDelegate[] {
    return Array.from(this.delegates.values())
      .filter(d => d.active && d.specializations.includes(proposalType))
      .sort((a, b) => b.reputation - a.reputation);
  }

  deactivateDelegate(address: string): boolean {
    const delegate = this.delegates.get(address);
    if (!delegate) return false;
    delegate.active = false;
    return true;
  }

  // --------------------------------------------------------------------------
  // Voting Power Management
  // --------------------------------------------------------------------------

  grantDelegatedPower(delegateAddress: string, power: number, fromAddress: string): void {
    const delegate = this.delegates.get(delegateAddress);
    if (!delegate) throw new Error(`Delegate ${delegateAddress} not found`);
    if (!delegate.active) throw new Error(`Delegate ${delegateAddress} is not active`);
    if (power <= 0) throw new Error('Power must be positive');

    const fromMap = this.delegatedPowerFrom.get(delegateAddress)!;
    const existing = fromMap.get(fromAddress) ?? 0;
    const delta = power - existing;

    fromMap.set(fromAddress, power);
    delegate.delegatedPower += delta;
  }

  revokeDelegatedPower(delegateAddress: string, fromAddress: string): void {
    const delegate = this.delegates.get(delegateAddress);
    if (!delegate) return;

    const fromMap = this.delegatedPowerFrom.get(delegateAddress);
    if (!fromMap) return;

    const power = fromMap.get(fromAddress) ?? 0;
    if (power === 0) return;

    fromMap.delete(fromAddress);
    delegate.delegatedPower = Math.max(0, delegate.delegatedPower - power);
  }

  // --------------------------------------------------------------------------
  // Voting Record
  // --------------------------------------------------------------------------

  recordDelegateVote(
    address: string,
    proposalId: string,
    proposalType: DaoProposalType,
    vote: DaoVoteType,
    rationale?: string
  ): DelegateVotingRecord {
    const delegate = this.delegates.get(address);
    if (!delegate) throw new Error(`Delegate ${address} not found`);

    const record: DelegateVotingRecord = {
      proposalId,
      proposalType,
      vote,
      rationale,
      timestamp: new Date(),
    };

    delegate.votingHistory.push(record);
    return record;
  }

  getDelegateHistory(address: string): DelegateVotingRecord[] {
    return this.delegates.get(address)?.votingHistory ?? [];
  }

  // --------------------------------------------------------------------------
  // Reputation
  // --------------------------------------------------------------------------

  updateDelegateReputation(address: string, delta: number, reason: string): void {
    const delegate = this.delegates.get(address);
    if (!delegate) return;

    delegate.reputation = Math.max(0, Math.min(1000, delegate.reputation + delta));
    this.reputationLog.push({ address, delta, reason, at: new Date() });
  }

  getDelegateLeaderboard(): Array<{ delegate: InstitutionalDelegate; score: number }> {
    return Array.from(this.delegates.values())
      .filter(d => d.active)
      .map(d => ({
        delegate: d,
        // Score = weighted combination of reputation, power, and participation
        score: d.reputation * 0.4 + d.delegatedPower * 0.3 + d.votingHistory.length * 10 * 0.3,
      }))
      .sort((a, b) => b.score - a.score);
  }

  // --------------------------------------------------------------------------
  // Analytics
  // --------------------------------------------------------------------------

  getStats(): DelegatedGovernanceStats {
    const all = Array.from(this.delegates.values());
    const active = all.filter(d => d.active);
    const totalDelegatedPower = active.reduce((s, d) => s + d.delegatedPower, 0);
    const topByPower = active.reduce<InstitutionalDelegate | undefined>(
      (top, d) => (!top || d.delegatedPower > top.delegatedPower) ? d : top,
      undefined
    );

    return {
      totalDelegates: all.length,
      activeDelegates: active.length,
      totalDelegatedPower,
      expertDelegates: active.filter(d => d.tier === 'expert').length,
      institutionalDelegates: active.filter(d => d.tier === 'institutional').length,
      topDelegateByPower: topByPower?.address,
      totalVotesCast: all.reduce((s, d) => s + d.votingHistory.length, 0),
    };
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

  private emit(event: DaoEvent): void {
    for (const cb of this.eventCallbacks) {
      try { cb(event); } catch { /* swallow */ }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function createDelegatedGovernanceManager(): DefaultDelegatedGovernanceManager {
  return new DefaultDelegatedGovernanceManager();
}
