/**
 * Protocol Constitution & Governance Charter Tests (Issue #126)
 *
 * Comprehensive tests for all 6 components + unified layer:
 * 1. Foundational Principles (purpose, values, immutability)
 * 2. Governance Charter (bodies, proposals, DAO parameters)
 * 3. AI Authority Spec (capability levels, bounds, overrides)
 * 4. Risk Boundaries (hard limits, soft limits, validation)
 * 5. Emergency Framework (activation, sunset, resolution)
 * 6. Amendment Process (proposal, review, voting, enactment)
 * 7. Unified Constitution Layer (integration tests)
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createFoundationalPrinciplesManager,
  createGovernanceCharterManager,
  createAiAuthorityManager,
  createRiskBoundaryManager,
  createEmergencyFrameworkManager,
  createAmendmentProcessManager,
  createProtocolConstitutionLayer,
  DefaultFoundationalPrinciplesManager,
  DefaultGovernanceCharterManager,
  DefaultAiAuthorityManager,
  DefaultRiskBoundaryManager,
  DefaultEmergencyFrameworkManager,
  DefaultAmendmentProcessManager,
  DefaultProtocolConstitutionLayer,
} from '../../core/protocol-constitution';

import type {
  FoundationalPrinciples,
  GovernanceBody,
  ConstitutionalProposal,
  AiCapabilitySpec,
  HardLimit,
  SoftLimit,
  EmergencyActivation,
  AmendmentProposal,
  ProtocolConstitutionHealth,
  ConstitutionEvent,
} from '../../core/protocol-constitution';

// ============================================================================
// 1. Foundational Principles Tests
// ============================================================================

describe('FoundationalPrinciplesManager', () => {
  let manager: DefaultFoundationalPrinciplesManager;

  beforeEach(() => {
    manager = createFoundationalPrinciplesManager() as DefaultFoundationalPrinciplesManager;
  });

  describe('getPrinciples', () => {
    it('returns principles with all required fields', () => {
      const principles: FoundationalPrinciples = manager.getPrinciples();

      expect(principles).toBeDefined();
      expect(principles.id).toBeTruthy();
      expect(principles.version).toBe('1.0.0');
      expect(principles.purpose).toBeTruthy();
      expect(principles.economicMission).toHaveLength(5);
      expect(principles.riskTolerance).toBe('moderate');
      expect(principles.decentralizationCommitment).toBe('progressive');
      expect(principles.coreValues.length).toBeGreaterThan(0);
      expect(principles.immutableClauses.length).toBeGreaterThan(0);
    });

    it('includes all 5 economic missions', () => {
      const principles = manager.getPrinciples();
      expect(principles.economicMission).toContain('autonomous_asset_management');
      expect(principles.economicMission).toContain('systemic_risk_stability');
      expect(principles.economicMission).toContain('monetary_policy');
      expect(principles.economicMission).toContain('liquidity_standard');
      expect(principles.economicMission).toContain('capital_markets');
    });
  });

  describe('immutable clauses', () => {
    it('returns the list of immutable clauses', () => {
      const clauses = manager.getImmutableClauses();
      expect(clauses.length).toBeGreaterThan(0);
      expect(clauses.some(c => c.includes('33%'))).toBe(true);
    });

    it('correctly identifies immutable clause', () => {
      const clauses = manager.getImmutableClauses();
      const firstClause = clauses[0];
      expect(manager.isImmutableClause(firstClause)).toBe(true);
    });

    it('returns false for non-immutable text', () => {
      expect(manager.isImmutableClause('some random text that is not a clause')).toBe(false);
    });

    it('adds a new immutable clause', () => {
      const newClause = 'No single strategy shall receive more than 30% of TVL';
      manager.addImmutableClause(newClause, 'dao_supermajority');
      expect(manager.isImmutableClause(newClause)).toBe(true);
    });

    it('throws if adding duplicate immutable clause', () => {
      const existing = manager.getImmutableClauses()[0];
      expect(() => manager.addImmutableClause(existing, 'dao_supermajority')).toThrow();
    });

    it('throws if no authorization provided', () => {
      expect(() => manager.addImmutableClause('new clause', '')).toThrow('Authorization required');
    });
  });

  describe('core values', () => {
    it('returns core values', () => {
      const values = manager.getCoreValues();
      expect(values.length).toBeGreaterThan(0);
      expect(values.some(v => v.includes('Transparency'))).toBe(true);
    });

    it('updates core values with authorization', () => {
      const newValues = ['Transparency: all actions public', 'Safety: always first'];
      const updated = manager.updateCoreValues(newValues, 'authorized_address');
      expect(updated.coreValues).toEqual(newValues);
    });

    it('throws when updating without authorization', () => {
      expect(() => manager.updateCoreValues(['new value'], '')).toThrow('Authorization required');
    });
  });

  describe('decentralization commitment', () => {
    it('can increase decentralization tier', () => {
      const updated = manager.updateDecentralizationCommitment('fully_decentralized', 'dao');
      expect(updated.decentralizationCommitment).toBe('fully_decentralized');
    });

    it('cannot decrease decentralization tier', () => {
      // First increase to fully_decentralized
      manager.updateDecentralizationCommitment('fully_decentralized', 'dao');
      // Then try to decrease back to progressive — should throw
      expect(() =>
        manager.updateDecentralizationCommitment('progressive', 'dao')
      ).toThrow('can only be increased');
    });
  });

  describe('mission validation', () => {
    it('validates valid mission set', () => {
      expect(manager.validateMissionAlignment(['autonomous_asset_management', 'monetary_policy'])).toBe(true);
    });
  });

  describe('events', () => {
    it('emits event when core values updated', () => {
      const events: ConstitutionEvent[] = [];
      manager.onEvent(e => events.push(e));
      manager.updateCoreValues(['Updated value'], 'authorized');
      expect(events.some(e => e.type === 'constitution.amended')).toBe(true);
    });

    it('unsubscribes correctly', () => {
      const events: ConstitutionEvent[] = [];
      const unsub = manager.onEvent(e => events.push(e));
      unsub();
      manager.updateCoreValues(['New value'], 'authorized');
      expect(events).toHaveLength(0);
    });
  });
});

// ============================================================================
// 2. Governance Charter Tests
// ============================================================================

describe('GovernanceCharterManager', () => {
  let manager: DefaultGovernanceCharterManager;

  beforeEach(() => {
    manager = createGovernanceCharterManager() as DefaultGovernanceCharterManager;
  });

  describe('governance bodies', () => {
    it('initializes all 5 default governance bodies', () => {
      const bodies = manager.getGovernanceBodies();
      expect(bodies).toHaveLength(5);
    });

    it('includes all required body types', () => {
      const types = manager.getGovernanceBodies().map(b => b.type);
      expect(types).toContain('token_holder_dao');
      expect(types).toContain('treasury_council');
      expect(types).toContain('risk_oversight_council');
      expect(types).toContain('emergency_stabilization');
      expect(types).toContain('ai_advisory_layer');
    });

    it('retrieves a specific governance body', () => {
      const dao = manager.getGovernanceBody('token_holder_dao');
      expect(dao).toBeDefined();
      expect(dao!.type).toBe('token_holder_dao');
      expect(dao!.votingThreshold.quorumPercent).toBe(10);
      expect(dao!.votingThreshold.approvalThreshold).toBe(51);
      expect(dao!.votingThreshold.supermajorityThreshold).toBe(75);
    });

    it('emergency committee has immediate voting period', () => {
      const committee = manager.getGovernanceBody('emergency_stabilization');
      expect(committee!.votingThreshold.votingPeriodDays).toBe(0);
    });

    it('AI advisory layer has zero voting power thresholds', () => {
      const ai = manager.getGovernanceBody('ai_advisory_layer');
      expect(ai!.votingThreshold.quorumPercent).toBe(0);
      expect(ai!.votingThreshold.approvalThreshold).toBe(0);
    });

    it('throws when registering duplicate active body', () => {
      expect(() =>
        manager.registerGovernanceBody({
          type: 'token_holder_dao',
          name: 'Duplicate DAO',
          description: 'Test',
          votingThreshold: { quorumPercent: 10, approvalThreshold: 51, supermajorityThreshold: 75, timelockDays: 2, votingPeriodDays: 7 },
          authorities: [],
          constraints: [],
          active: true,
        })
      ).toThrow('already exists and is active');
    });

    it('updates voting threshold', () => {
      const updated = manager.updateVotingThreshold('token_holder_dao', { quorumPercent: 15 });
      expect(updated.votingThreshold.quorumPercent).toBe(15);
    });
  });

  describe('constitutional proposals', () => {
    it('creates a standard proposal', () => {
      const proposal: ConstitutionalProposal = manager.createProposal({
        title: 'Increase quorum to 15%',
        description: 'Raise participation requirement',
        proposalType: 'standard',
        proposerAddress: '0xproposer',
        targetBody: 'token_holder_dao',
        actions: [],
      });

      expect(proposal).toBeDefined();
      expect(proposal.id).toBeTruthy();
      expect(proposal.title).toBe('Increase quorum to 15%');
      expect(proposal.stage).toBe('draft');
      expect(proposal.forVotes).toBe(0);
      expect(proposal.auditRequired).toBe(false);  // standard = no audit
    });

    it('creates a constitutional proposal requiring audit', () => {
      const proposal = manager.createProposal({
        title: 'Amend foundational principles',
        description: 'Constitutional change',
        proposalType: 'constitutional',
        proposerAddress: '0xproposer',
        targetBody: 'token_holder_dao',
        actions: [],
      });

      expect(proposal.auditRequired).toBe(true);
    });

    it('advances proposal through draft -> review -> voting', () => {
      const proposal = manager.createProposal({
        title: 'Test Proposal',
        description: 'Testing stages',
        proposalType: 'standard',
        proposerAddress: '0xproposer',
        targetBody: 'token_holder_dao',
        actions: [],
      });

      const reviewed = manager.advanceProposalStage(proposal.id, '0xauthorized');
      expect(reviewed.stage).toBe('review');

      const voting = manager.advanceProposalStage(proposal.id, '0xauthorized');
      expect(voting.stage).toBe('voting');
      expect(voting.votingStartAt).toBeDefined();
      expect(voting.votingEndAt).toBeDefined();
    });

    it('records votes on a proposal', () => {
      const proposal = manager.createProposal({
        title: 'Vote Test',
        description: 'Testing votes',
        proposalType: 'standard',
        proposerAddress: '0xproposer',
        targetBody: 'token_holder_dao',
        actions: [],
      });

      // Advance to voting
      manager.advanceProposalStage(proposal.id, '0xauthorized'); // draft -> review
      manager.advanceProposalStage(proposal.id, '0xauthorized'); // review -> voting

      const afterVote = manager.castVote(proposal.id, '0xalice', 'for', 500);
      expect(afterVote.forVotes).toBe(500);

      const afterVote2 = manager.castVote(proposal.id, '0xbob', 'against', 200);
      expect(afterVote2.againstVotes).toBe(200);

      const afterVote3 = manager.castVote(proposal.id, '0xcarol', 'abstain', 100);
      expect(afterVote3.abstainVotes).toBe(100);
    });

    it('rejects invalid vote on non-voting proposal', () => {
      const proposal = manager.createProposal({
        title: 'Draft Proposal',
        description: 'Still in draft',
        proposalType: 'standard',
        proposerAddress: '0xproposer',
        targetBody: 'token_holder_dao',
        actions: [],
      });

      expect(() => manager.castVote(proposal.id, '0xalice', 'for', 100)).toThrow('not in voting stage');
    });

    it('applies AI advisory score', () => {
      const proposal = manager.createProposal({
        title: 'AI Advisory Test',
        description: 'Test AI advisory',
        proposalType: 'standard',
        proposerAddress: '0xproposer',
        targetBody: 'token_holder_dao',
        actions: [],
      });

      const updated = manager.applyAiAdvisory(proposal.id, 82, ['Risk score: medium', 'Recommend review']);
      expect(updated.aiAdvisoryScore).toBe(82);
      expect(updated.aiAdvisoryNotes).toHaveLength(2);
    });

    it('retrieves active and pending proposals', () => {
      const p1 = manager.createProposal({
        title: 'Proposal 1',
        description: 'First proposal',
        proposalType: 'standard',
        proposerAddress: '0xproposer',
        targetBody: 'token_holder_dao',
        actions: [],
      });

      manager.advanceProposalStage(p1.id, '0xauthorized'); // draft -> review
      manager.advanceProposalStage(p1.id, '0xauthorized'); // review -> voting

      const active = manager.getActiveProposals();
      expect(active).toHaveLength(1);

      const p2 = manager.createProposal({
        title: 'Proposal 2',
        description: 'Second proposal still in draft',
        proposalType: 'standard',
        proposerAddress: '0xproposer',
        targetBody: 'treasury_council',
        actions: [],
      });

      const pending = manager.getPendingProposals();
      expect(pending.some(p => p.id === p2.id)).toBe(true);
    });
  });

  describe('DAO parameters', () => {
    it('returns default DAO parameters', () => {
      const params = manager.getDaoParameters();
      expect(params.standardVotingPeriodDays).toBe(7);
      expect(params.constitutionalVotingPeriodDays).toBe(14);
      expect(params.standardApprovalPercent).toBe(51);
      expect(params.constitutionalApprovalPercent).toBe(75);
      expect(params.delegationEnabled).toBe(true);
    });

    it('updates DAO parameters with authorization', () => {
      const updated = manager.updateDaoParameters({ standardVotingPeriodDays: 10 }, '0xauthorized');
      expect(updated.standardVotingPeriodDays).toBe(10);
    });

    it('throws when updating without authorization', () => {
      expect(() => manager.updateDaoParameters({ standardVotingPeriodDays: 10 }, '')).toThrow('Authorization required');
    });
  });

  describe('events', () => {
    it('emits proposal.created event', () => {
      const events: ConstitutionEvent[] = [];
      manager.onEvent(e => events.push(e));

      manager.createProposal({
        title: 'Event Test',
        description: 'Testing events',
        proposalType: 'standard',
        proposerAddress: '0xproposer',
        targetBody: 'token_holder_dao',
        actions: [],
      });

      expect(events.some(e => e.type === 'proposal.created')).toBe(true);
    });
  });
});

// ============================================================================
// 3. AI Authority Tests
// ============================================================================

describe('AiAuthorityManager', () => {
  let manager: DefaultAiAuthorityManager;

  beforeEach(() => {
    manager = createAiAuthorityManager() as DefaultAiAuthorityManager;
  });

  describe('capability spec', () => {
    it('returns full authority spec', () => {
      const spec = manager.getAuthoritySpec();
      expect(spec).toBeDefined();
      expect(spec.version).toBe('1.0.0');
      expect(spec.capabilities.length).toBeGreaterThan(5);
      expect(spec.prohibitedActions.length).toBeGreaterThan(0);
      expect(spec.overrideAuthority.length).toBeGreaterThan(0);
    });

    it('includes prohibited actions list', () => {
      const prohibited = manager.getProhibitedActions();
      expect(prohibited).toContain('treasury_confiscation');
      expect(prohibited).toContain('governance_override');
      expect(prohibited).toContain('protocol_shutdown');
    });

    it('retrieves capabilities by authority level', () => {
      const bounded = manager.getCapabilitiesByLevel('bounded_autonomous');
      expect(bounded.length).toBeGreaterThan(0);
      bounded.forEach(c => expect(c.authorityLevel).toBe('bounded_autonomous'));

      const prohibited = manager.getCapabilitiesByLevel('prohibited');
      expect(prohibited.length).toBeGreaterThan(0);
      prohibited.forEach(c => expect(c.authorityLevel).toBe('prohibited'));

      const advisory = manager.getCapabilitiesByLevel('advisory_only');
      expect(advisory.length).toBeGreaterThan(0);
    });
  });

  describe('authority checks', () => {
    it('bounded_autonomous capability can act autonomously', () => {
      const bounded = manager.getCapabilitiesByLevel('bounded_autonomous')[0];
      expect(manager.canActAutonomously(bounded.id)).toBe(true);
    });

    it('advisory_only capability cannot act autonomously', () => {
      const advisory = manager.getCapabilitiesByLevel('advisory_only')[0];
      expect(manager.canActAutonomously(advisory.id)).toBe(false);
    });

    it('prohibited capability cannot act autonomously', () => {
      const prohibited = manager.getCapabilitiesByLevel('prohibited')[0];
      expect(manager.canActAutonomously(prohibited.id)).toBe(false);
    });

    it('correctly identifies prohibited actions', () => {
      expect(manager.isProhibited('treasury_confiscation')).toBe(true);
      expect(manager.isProhibited('governance_override')).toBe(true);
      expect(manager.isProhibited('some_allowed_action')).toBe(false);
    });

    it('validates action within bounds', () => {
      const bounded = manager.getCapabilitiesByLevel('bounded_autonomous')
        .find(c => c.bounds?.maxAbsoluteValue !== undefined);

      if (bounded && bounded.bounds?.maxAbsoluteValue !== undefined) {
        expect(manager.validateActionWithinBounds(bounded.id, bounded.bounds.maxAbsoluteValue - 1)).toBe(true);
        expect(manager.validateActionWithinBounds(bounded.id, bounded.bounds.maxAbsoluteValue + 1)).toBe(false);
      }
    });

    it('returns true for unknown capability bounds', () => {
      expect(manager.validateActionWithinBounds('nonexistent_cap', 100)).toBe(true);
    });
  });

  describe('human overrides', () => {
    it('applies a human override', () => {
      const bounded = manager.getCapabilitiesByLevel('bounded_autonomous')[0];
      const override = manager.applyHumanOverride(bounded.id, 'Risk too high', '0xrisk_council');

      expect(override.id).toBeTruthy();
      expect(override.capabilityId).toBe(bounded.id);
      expect(override.reason).toBe('Risk too high');
      expect(override.active).toBe(true);
    });

    it('blocks autonomous action after override', () => {
      const bounded = manager.getCapabilitiesByLevel('bounded_autonomous')[0];
      expect(manager.canActAutonomously(bounded.id)).toBe(true);

      manager.applyHumanOverride(bounded.id, 'Emergency block', '0xrisk_council');
      expect(manager.canActAutonomously(bounded.id)).toBe(false);
    });

    it('restores autonomous action after clearing override', () => {
      const bounded = manager.getCapabilitiesByLevel('bounded_autonomous')[0];
      const override = manager.applyHumanOverride(bounded.id, 'Temporary block', '0xrisk_council');

      manager.clearOverride(override.id, '0xrisk_council');
      expect(manager.canActAutonomously(bounded.id)).toBe(true);
    });

    it('throws when applying override to unknown capability', () => {
      expect(() =>
        manager.applyHumanOverride('nonexistent_cap', 'reason', '0xauthorized')
      ).toThrow('Unknown AI capability');
    });

    it('throws when applying override without authorization', () => {
      const bounded = manager.getCapabilitiesByLevel('bounded_autonomous')[0];
      expect(() => manager.applyHumanOverride(bounded.id, 'reason', '')).toThrow('Authorization required');
    });
  });

  describe('audit logging', () => {
    it('records an AI action', () => {
      const bounded = manager.getCapabilitiesByLevel('bounded_autonomous')[0];
      const log = manager.recordAiAction(bounded.id, 'Adjusted risk parameter to 0.15', 'success');

      expect(log.id).toBeTruthy();
      expect(log.capabilityId).toBe(bounded.id);
      expect(log.action).toBe('Adjusted risk parameter to 0.15');
      expect(log.result).toBe('success');
      expect(log.authorityLevel).toBe('bounded_autonomous');
    });

    it('retrieves action log', () => {
      const bounded = manager.getCapabilitiesByLevel('bounded_autonomous')[0];
      manager.recordAiAction(bounded.id, 'Action 1', 'success');
      manager.recordAiAction(bounded.id, 'Action 2', 'success');

      const logs = manager.getActionLog(10);
      expect(logs.length).toBe(2);
    });
  });

  describe('events', () => {
    it('emits event on AI action recorded', () => {
      const events: ConstitutionEvent[] = [];
      manager.onEvent(e => events.push(e));

      const bounded = manager.getCapabilitiesByLevel('bounded_autonomous')[0];
      manager.recordAiAction(bounded.id, 'Test action', 'success');

      expect(events.some(e => e.type === 'ai_authority.action_taken')).toBe(true);
    });

    it('emits event on override applied', () => {
      const events: ConstitutionEvent[] = [];
      manager.onEvent(e => events.push(e));

      const bounded = manager.getCapabilitiesByLevel('bounded_autonomous')[0];
      manager.applyHumanOverride(bounded.id, 'Test override', '0xauthorized');

      expect(events.some(e => e.type === 'ai_authority.override_applied')).toBe(true);
    });
  });
});

// ============================================================================
// 4. Risk Boundaries Tests
// ============================================================================

describe('RiskBoundaryManager', () => {
  let manager: DefaultRiskBoundaryManager;

  beforeEach(() => {
    manager = createRiskBoundaryManager() as DefaultRiskBoundaryManager;
  });

  describe('boundaries access', () => {
    it('returns risk boundary definitions', () => {
      const boundaries = manager.getRiskBoundaries();
      expect(boundaries).toBeDefined();
      expect(boundaries.hardLimits.length).toBeGreaterThan(0);
      expect(boundaries.softLimits.length).toBeGreaterThan(0);
      expect(boundaries.insuranceReserveMinimum).toBe(5);
      expect(boundaries.treasuryReserveRatio).toBe(20);
      expect(boundaries.maxSystemicExposure).toBe(50);
    });

    it('retrieves a specific hard limit', () => {
      const limit: HardLimit | undefined = manager.getHardLimit('max_leverage_ratio');
      expect(limit).toBeDefined();
      expect(limit!.currentValue).toBe(10);
      expect(limit!.unit).toBe('ratio');
      expect(limit!.amendmentRequirement).toBe('supermajority');
    });

    it('retrieves a specific soft limit', () => {
      const limit: SoftLimit | undefined = manager.getSoftLimit('target_liquidity_reserve_pct');
      expect(limit).toBeDefined();
      expect(limit!.currentValue).toBe(25);
      expect(limit!.allowedRange.min).toBe(20);
      expect(limit!.allowedRange.max).toBe(50);
    });

    it('correctly identifies the immutable floor limit', () => {
      const floor = manager.getHardLimit('insurance_reserve_floor_pct');
      expect(floor).toBeDefined();
      expect(floor!.immutable).toBe(true);
      expect(floor!.amendmentRequirement).toBe('immutable');
    });
  });

  describe('validation', () => {
    it('validates value within hard limit', () => {
      const result = manager.validateParameter('max_leverage_ratio', 8);
      expect(result.valid).toBe(true);
      expect(result.warningLevel).toBe('none');
    });

    it('rejects value exceeding hard limit', () => {
      const result = manager.validateParameter('max_leverage_ratio', 15);
      expect(result.valid).toBe(false);
      expect(result.warningLevel).toBe('critical');
      expect(result.violation).toContain('hard limit');
    });

    it('validates systemic exposure within limit', () => {
      const result = manager.checkSystemicExposure(30);
      expect(result.valid).toBe(true);
    });

    it('rejects systemic exposure above limit', () => {
      const result = manager.checkSystemicExposure(60);
      expect(result.valid).toBe(false);
      expect(result.warningLevel).toBe('critical');
    });

    it('warns when systemic exposure approaches limit', () => {
      const result = manager.checkSystemicExposure(44); // 88% of 50 limit
      expect(result.valid).toBe(true);
      expect(result.warningLevel).toBe('warning');
    });

    it('validates insurance reserve above minimum', () => {
      const result = manager.checkInsuranceReserve(8);
      expect(result.valid).toBe(true);
    });

    it('rejects insurance reserve below minimum', () => {
      const result = manager.checkInsuranceReserve(3);
      expect(result.valid).toBe(false);
      expect(result.violation).toContain('below minimum');
    });
  });

  describe('updates', () => {
    it('updates soft limit within allowed range', () => {
      const updated = manager.updateSoftLimit('target_liquidity_reserve_pct', 30, '0xauthorized');
      expect(updated.currentValue).toBe(30);
    });

    it('rejects soft limit update outside allowed range', () => {
      expect(() =>
        manager.updateSoftLimit('target_liquidity_reserve_pct', 60, '0xauthorized')
      ).toThrow('outside allowed range');
    });

    it('updates non-immutable hard limit with supermajority authorization', () => {
      const updated = manager.updateHardLimit('max_leverage_ratio', 8, '0xdao_supermajority');
      expect(updated.currentValue).toBe(8);
      expect(updated.lastAmendedAt).toBeDefined();
    });

    it('rejects update to immutable hard limit', () => {
      expect(() =>
        manager.updateHardLimit('insurance_reserve_floor_pct', 1, '0xdao_supermajority')
      ).toThrow('constitutionally immutable');
    });

    it('cannot lower insurance reserve below absolute floor', () => {
      expect(() =>
        manager.updateHardLimit('insurance_reserve_min_pct', 1, '0xdao_supermajority')
      ).toThrow('constitutional floor');
    });
  });

  describe('events', () => {
    it('emits event when soft limit updated', () => {
      const events: ConstitutionEvent[] = [];
      manager.onEvent(e => events.push(e));

      manager.updateSoftLimit('target_liquidity_reserve_pct', 30, '0xauthorized');
      expect(events.some(e => e.type === 'constitution.amended')).toBe(true);
    });
  });
});

// ============================================================================
// 5. Emergency Framework Tests
// ============================================================================

describe('EmergencyFrameworkManager', () => {
  let manager: DefaultEmergencyFrameworkManager;

  beforeEach(() => {
    manager = createEmergencyFrameworkManager() as DefaultEmergencyFrameworkManager;
  });

  describe('framework access', () => {
    it('returns emergency framework with trigger conditions', () => {
      const framework = manager.getFramework();
      expect(framework.triggerConditions.length).toBeGreaterThan(0);
      expect(framework.availablePowers.length).toBeGreaterThan(0);
      expect(framework.maxActivationDurationDays).toBe(7);
      expect(framework.requiredActivators).toBe(4);
    });

    it('validates activation conditions', () => {
      expect(manager.canActivate('systemic_risk_threshold')).toBe(true);
      expect(manager.canActivate('oracle_failure')).toBe(true);
      expect(manager.canActivate('stablecoin_depeg')).toBe(true);
    });

    it('validates available powers', () => {
      expect(manager.isPowerAvailable('trading_halt')).toBe(true);
      expect(manager.isPowerAvailable('leverage_freeze')).toBe(true);
      expect(manager.isPowerAvailable('circuit_breaker')).toBe(true);
      expect(manager.isPowerAvailable('protocol_migration')).toBe(true);
    });
  });

  describe('emergency activation', () => {
    it('activates emergency with valid trigger and powers', () => {
      const activation: EmergencyActivation = manager.activateEmergency(
        'oracle_failure',
        'Chainlink oracle stopped updating 30+ minutes ago',
        '0xemergency_committee',
        ['trading_halt', 'circuit_breaker']
      );

      expect(activation.id).toBeTruthy();
      expect(activation.triggerCondition).toBe('oracle_failure');
      expect(activation.activatedPowers).toContain('trading_halt');
      expect(activation.active).toBe(true);
      expect(activation.sunsetAt).toBeInstanceOf(Date);
      expect(activation.sunsetAt > activation.activatedAt).toBe(true);
    });

    it('includes affected components', () => {
      const activation = manager.activateEmergency(
        'stablecoin_depeg',
        'USDC trading at 0.93',
        '0xemergency_committee',
        ['trading_halt']
      );
      expect(activation.affectedComponents.length).toBeGreaterThan(0);
    });

    it('throws when activating with unknown power', () => {
      expect(() =>
        manager.activateEmergency(
          'oracle_failure',
          'Test',
          '0xcommittee',
          ['nonexistent_power' as never]
        )
      ).toThrow('not available');
    });

    it('throws when no powers requested', () => {
      expect(() =>
        manager.activateEmergency('oracle_failure', 'Test', '0xcommittee', [])
      ).toThrow('At least one emergency power');
    });

    it('throws when no triggering authority provided', () => {
      expect(() =>
        manager.activateEmergency('oracle_failure', 'Test', '', ['trading_halt'])
      ).toThrow('Triggering authority required');
    });

    it('tracks active emergencies', () => {
      expect(manager.getActiveEmergencies()).toHaveLength(0);

      manager.activateEmergency(
        'oracle_failure',
        'Test emergency',
        '0xcommittee',
        ['circuit_breaker']
      );

      expect(manager.getActiveEmergencies()).toHaveLength(1);
    });
  });

  describe('emergency resolution', () => {
    it('resolves an active emergency', () => {
      const activation = manager.activateEmergency(
        'systemic_risk_threshold',
        'Risk score hit 92/100',
        '0xcommittee',
        ['trading_halt']
      );

      const resolved = manager.resolveEmergency(
        activation.id,
        '0xrisk_council',
        'Risk score reduced to 45 after manual intervention'
      );

      expect(resolved.active).toBe(false);
      expect(resolved.resolvedBy).toBe('0xrisk_council');
      expect(resolved.resolutionNotes).toBeTruthy();
      expect(resolved.resolvedAt).toBeInstanceOf(Date);
    });

    it('throws when resolving already resolved emergency', () => {
      const activation = manager.activateEmergency(
        'clearing_failure',
        'Test',
        '0xcommittee',
        ['circuit_breaker']
      );

      manager.resolveEmergency(activation.id, '0xrisk_council', 'Fixed');

      expect(() =>
        manager.resolveEmergency(activation.id, '0xrisk_council', 'Double resolve')
      ).toThrow('already resolved');
    });
  });

  describe('auto-sunset', () => {
    it('expires overdue emergencies', () => {
      // Create emergency with past sunset time
      const manager2 = createEmergencyFrameworkManager({
        maxActivationDurationDays: 0,  // Expires immediately
      }) as DefaultEmergencyFrameworkManager;

      const activation = manager2.activateEmergency(
        'oracle_failure',
        'Test',
        '0xcommittee',
        ['trading_halt']
      );

      // Move sunset to the past by reactivating with 0-day duration
      // The sunset is in the past since maxActivationDurationDays = 0
      const expired = manager2.expireOverdueEmergencies();
      expect(expired.length).toBeGreaterThan(0);

      const active = manager2.getActiveEmergencies();
      expect(active).toHaveLength(0);
    });
  });

  describe('events', () => {
    it('emits event on emergency activation', () => {
      const events: ConstitutionEvent[] = [];
      manager.onEvent(e => events.push(e));

      manager.activateEmergency(
        'oracle_failure',
        'Test',
        '0xcommittee',
        ['trading_halt']
      );

      expect(events.some(e => e.type === 'emergency.activated')).toBe(true);
    });

    it('emits event on emergency resolution', () => {
      const events: ConstitutionEvent[] = [];
      manager.onEvent(e => events.push(e));

      const activation = manager.activateEmergency(
        'oracle_failure',
        'Test',
        '0xcommittee',
        ['trading_halt']
      );

      manager.resolveEmergency(activation.id, '0xcouncil', 'Fixed');

      expect(events.some(e => e.type === 'emergency.resolved')).toBe(true);
    });
  });
});

// ============================================================================
// 6. Amendment Process Tests
// ============================================================================

describe('AmendmentProcessManager', () => {
  let manager: DefaultAmendmentProcessManager;

  beforeEach(() => {
    manager = createAmendmentProcessManager() as DefaultAmendmentProcessManager;
  });

  describe('process rules', () => {
    it('returns amendment process rules', () => {
      const rules = manager.getProcessRules();
      expect(rules.communityReviewPeriodDays).toBe(14);
      expect(rules.auditRequiredForTypes).toContain('constitutional');
      expect(rules.auditRequiredForTypes).toContain('structural');
      expect(rules.immutableClauses.length).toBeGreaterThan(0);
    });

    it('returns immutable clauses list', () => {
      const clauses = manager.getImmutableClauses();
      expect(clauses.length).toBeGreaterThan(0);
      expect(clauses.some(c => c.includes('exit'))).toBe(true);
    });
  });

  describe('proposeAmendment', () => {
    it('creates a standard_parameter amendment', () => {
      const amendment: AmendmentProposal = manager.proposeAmendment({
        amendmentType: 'standard_parameter',
        title: 'Increase quorum to 15%',
        rationale: 'Higher participation needed for legitimacy',
        proposerAddress: '0xproposer',
        targetSection: 'governance_parameters',
        currentText: 'quorumPercent: 10',
        proposedText: 'quorumPercent: 15',
        impactAssessment: 'Medium impact — reduces governance efficiency slightly',
      });

      expect(amendment.id).toBeTruthy();
      expect(amendment.amendmentType).toBe('standard_parameter');
      expect(amendment.status).toBe('draft');
      expect(amendment.requiredApprovalThreshold).toBe(51);  // standard = 51%
      expect(amendment.requiredQuorum).toBe(10);
    });

    it('creates a constitutional amendment with higher thresholds', () => {
      const amendment = manager.proposeAmendment({
        amendmentType: 'constitutional',
        title: 'Update decentralization commitment',
        rationale: 'Move to fully decentralized model',
        proposerAddress: '0xproposer',
        targetSection: 'foundational_principles',
        currentText: 'decentralizationCommitment: progressive',
        proposedText: 'decentralizationCommitment: fully_decentralized',
        impactAssessment: 'Major structural change',
      });

      expect(amendment.requiredApprovalThreshold).toBe(75);  // constitutional = supermajority
      expect(amendment.requiredQuorum).toBe(20);
    });

    it('throws when trying to amend immutable clause', () => {
      const immutableClause = manager.getImmutableClauses()[0];

      expect(() =>
        manager.proposeAmendment({
          amendmentType: 'constitutional',
          title: 'Remove immutable protection',
          rationale: 'Test',
          proposerAddress: '0xproposer',
          targetSection: 'foundational_principles',
          currentText: immutableClause,  // This is an immutable clause
          proposedText: 'Modified clause',
          impactAssessment: 'Test',
        })
      ).toThrow('Cannot amend immutable clause');
    });
  });

  describe('amendment lifecycle', () => {
    let amendmentId: string;

    beforeEach(() => {
      const amendment = manager.proposeAmendment({
        amendmentType: 'standard_parameter',
        title: 'Test Amendment',
        rationale: 'Testing lifecycle',
        proposerAddress: '0xproposer',
        targetSection: 'risk_parameters',
        currentText: 'max_leverage_ratio: 10',
        proposedText: 'max_leverage_ratio: 8',
        impactAssessment: 'Minor change',
      });
      amendmentId = amendment.id;
    });

    it('starts community review from draft', () => {
      const updated = manager.startCommunityReview(amendmentId, '0xauthorized');
      expect(updated.status).toBe('community_review');
      expect(updated.communityReviewStartAt).toBeDefined();
      expect(updated.communityReviewEndAt).toBeDefined();
    });

    it('starts voting after community review (standard amendment — no audit needed)', () => {
      manager.startCommunityReview(amendmentId, '0xauthorized');
      const voting = manager.startVoting(amendmentId, '0xauthorized');
      expect(voting.status).toBe('voting');
      expect(voting.votingStartAt).toBeDefined();
    });

    it('records votes during voting stage', () => {
      manager.startCommunityReview(amendmentId, '0xauthorized');
      manager.startVoting(amendmentId, '0xauthorized');

      manager.castVote(amendmentId, '0xalice', 'for', 600);
      manager.castVote(amendmentId, '0xbob', 'against', 200);

      const amendment = manager.getAmendment(amendmentId)!;
      expect(amendment.forVotes).toBe(600);
      expect(amendment.againstVotes).toBe(200);
    });

    it('prevents double voting', () => {
      manager.startCommunityReview(amendmentId, '0xauthorized');
      manager.startVoting(amendmentId, '0xauthorized');

      manager.castVote(amendmentId, '0xalice', 'for', 600);
      expect(() =>
        manager.castVote(amendmentId, '0xalice', 'against', 100)
      ).toThrow('already voted');
    });

    it('concludes voting successfully when threshold met', () => {
      manager.startCommunityReview(amendmentId, '0xauthorized');
      manager.startVoting(amendmentId, '0xauthorized');

      manager.castVote(amendmentId, '0xalice', 'for', 600);
      manager.castVote(amendmentId, '0xbob', 'against', 200);

      const concluded = manager.concludeVoting(amendmentId);
      // 600/800 = 75% for — should pass 51% threshold
      expect(concluded.status).toBe('timelock');
      expect(concluded.timelockEndAt).toBeDefined();
    });

    it('rejects amendment when threshold not met', () => {
      manager.startCommunityReview(amendmentId, '0xauthorized');
      manager.startVoting(amendmentId, '0xauthorized');

      manager.castVote(amendmentId, '0xalice', 'for', 200);
      manager.castVote(amendmentId, '0xbob', 'against', 800);

      const concluded = manager.concludeVoting(amendmentId);
      // 200/1000 = 20% for — fails 51% threshold
      expect(concluded.status).toBe('rejected');
    });

    it('allows proposer to withdraw amendment', () => {
      const withdrawn = manager.withdrawAmendment(amendmentId, '0xproposer');
      expect(withdrawn.status).toBe('withdrawn');
    });

    it('prevents non-proposer from withdrawing', () => {
      expect(() => manager.withdrawAmendment(amendmentId, '0xsomeone_else')).toThrow('Only the proposer');
    });
  });

  describe('constitutional amendment audit requirement', () => {
    it('requires audit before voting for constitutional amendments', () => {
      const amendment = manager.proposeAmendment({
        amendmentType: 'constitutional',
        title: 'Constitutional Change',
        rationale: 'Test',
        proposerAddress: '0xproposer',
        targetSection: 'governance_architecture',
        currentText: 'memberCount: 5',
        proposedText: 'memberCount: 7',
        impactAssessment: 'Expands council',
      });

      // Move to community review
      manager.startCommunityReview(amendment.id, '0xauthorized');

      // Try to go directly to voting without audit — should throw
      expect(() =>
        manager.startVoting(amendment.id, '0xauthorized')
      ).toThrow('Audit is required');
    });
  });

  describe('required threshold calculation', () => {
    it('returns correct thresholds for each amendment type', () => {
      const standardThreshold = manager.getRequiredThreshold('standard_parameter');
      expect(standardThreshold.approval).toBe(51);
      expect(standardThreshold.quorum).toBe(10);

      const constitutionalThreshold = manager.getRequiredThreshold('constitutional');
      expect(constitutionalThreshold.approval).toBe(75);
      expect(constitutionalThreshold.quorum).toBe(20);

      const structuralThreshold = manager.getRequiredThreshold('structural');
      expect(structuralThreshold.approval).toBe(66);
    });
  });

  describe('immutability check', () => {
    it('allows amending non-immutable content', () => {
      expect(manager.canAmend('max_leverage_ratio: 10')).toBe(true);
    });

    it('blocks amending immutable clauses', () => {
      const immutable = manager.getImmutableClauses()[0];
      expect(manager.canAmend(immutable)).toBe(false);
    });
  });

  describe('events', () => {
    it('emits event when amendment proposed', () => {
      const events: ConstitutionEvent[] = [];
      manager.onEvent(e => events.push(e));

      manager.proposeAmendment({
        amendmentType: 'standard_parameter',
        title: 'Test',
        rationale: 'Test',
        proposerAddress: '0xproposer',
        targetSection: 'risk',
        currentText: 'value: 10',
        proposedText: 'value: 8',
        impactAssessment: 'Minor',
      });

      expect(events.some(e => e.type === 'amendment.proposed')).toBe(true);
    });
  });
});

// ============================================================================
// 7. Unified Protocol Constitution Layer (Integration Tests)
// ============================================================================

describe('DefaultProtocolConstitutionLayer', () => {
  let layer: DefaultProtocolConstitutionLayer;

  beforeEach(() => {
    layer = createProtocolConstitutionLayer() as DefaultProtocolConstitutionLayer;
  });

  describe('initialization', () => {
    it('initializes all sub-systems', () => {
      expect(layer.principles).toBeDefined();
      expect(layer.governance).toBeDefined();
      expect(layer.aiAuthority).toBeDefined();
      expect(layer.riskBoundaries).toBeDefined();
      expect(layer.emergency).toBeDefined();
      expect(layer.amendments).toBeDefined();
    });
  });

  describe('getConstitution', () => {
    it('returns complete constitution document', () => {
      const constitution = layer.getConstitution();
      expect(constitution).toBeDefined();
      expect(constitution.version).toBe('1.0.0');
      expect(constitution.name).toContain('Protocol Constitution');
      expect(constitution.preamble).toBeTruthy();
      expect(constitution.status).toBe('ratified');
      expect(constitution.foundationalPrinciples).toBeDefined();
      expect(constitution.governanceBodies).toHaveLength(5);
      expect(constitution.aiAuthoritySpec).toBeDefined();
      expect(constitution.riskBoundaries).toBeDefined();
      expect(constitution.monetaryRules).toBeDefined();
      expect(constitution.emergencyFramework).toBeDefined();
      expect(constitution.amendmentRules).toBeDefined();
      expect(constitution.complianceSpec).toBeDefined();
    });
  });

  describe('governance operations', () => {
    it('creates a governance proposal', () => {
      const proposal = layer.createGovernanceProposal({
        title: 'Integration Test Proposal',
        description: 'Testing the unified layer',
        proposalType: 'standard',
        proposerAddress: '0xproposer',
        targetBody: 'token_holder_dao',
        actions: [],
      });

      expect(proposal).toBeDefined();
      expect(proposal.title).toBe('Integration Test Proposal');
    });

    it('returns DAO parameters', () => {
      const params = layer.getDaoParameters();
      expect(params.standardVotingPeriodDays).toBe(7);
    });

    it('returns governance bodies', () => {
      const bodies = layer.getGovernanceBodies();
      expect(bodies).toHaveLength(5);
    });
  });

  describe('AI authority operations', () => {
    it('checks AI authority for bounded capability', () => {
      const bounded = layer.aiAuthority.getCapabilitiesByLevel('bounded_autonomous')[0];
      const result = layer.checkAiAuthority(bounded.id);

      expect(result.canAct).toBe(true);
    });

    it('checks AI authority for prohibited action', () => {
      const prohibited = layer.aiAuthority.getCapabilitiesByLevel('prohibited')[0];
      const result = layer.checkAiAuthority(prohibited.id);

      expect(result.canAct).toBe(false);
    });

    it('records AI action through unified layer', () => {
      const bounded = layer.aiAuthority.getCapabilitiesByLevel('bounded_autonomous')[0];
      const log = layer.recordAiAction(bounded.id, 'Adjusted parameter', 'success');

      expect(log).toBeDefined();
      expect(log.capabilityId).toBe(bounded.id);
    });

    it('applies AI override through unified layer', () => {
      const bounded = layer.aiAuthority.getCapabilitiesByLevel('bounded_autonomous')[0];
      const override = layer.applyAiOverride(bounded.id, 'Emergency block', '0xrisk_council');

      expect(override).toBeDefined();
      expect(override.active).toBe(true);
    });
  });

  describe('risk boundary operations', () => {
    it('validates risk parameter through unified layer', () => {
      const result = layer.validateRiskParameter('max_leverage_ratio', 8);
      expect(result.valid).toBe(true);
    });

    it('checks systemic exposure', () => {
      const result = layer.checkSystemicExposure(40);
      expect(result.valid).toBe(true);
    });

    it('checks insurance reserve', () => {
      const okResult = layer.checkInsuranceReserve(8);
      expect(okResult.valid).toBe(true);

      const failResult = layer.checkInsuranceReserve(3);
      expect(failResult.valid).toBe(false);
    });
  });

  describe('emergency operations', () => {
    it('activates emergency through unified layer', () => {
      const activation = layer.activateEmergency(
        'oracle_failure',
        'Oracle stopped updating',
        '0xemergency_committee',
        ['trading_halt']
      );

      expect(activation).toBeDefined();
      expect(activation.active).toBe(true);
    });

    it('resolves emergency through unified layer', () => {
      const activation = layer.activateEmergency(
        'stablecoin_depeg',
        'USDC at 0.94',
        '0xemergency_committee',
        ['circuit_breaker']
      );

      const resolved = layer.resolveEmergency(activation.id, '0xrisk_council', 'Peg restored');
      expect(resolved.active).toBe(false);
    });

    it('returns active emergencies', () => {
      expect(layer.getActiveEmergencies()).toHaveLength(0);

      layer.activateEmergency(
        'clearing_failure',
        'Settlement halted',
        '0xemergency_committee',
        ['trading_halt']
      );

      expect(layer.getActiveEmergencies()).toHaveLength(1);
    });
  });

  describe('amendment operations', () => {
    it('proposes amendment through unified layer', () => {
      const amendment = layer.proposeAmendment({
        amendmentType: 'standard_parameter',
        title: 'Reduce leverage ceiling',
        rationale: 'Risk reduction',
        proposerAddress: '0xproposer',
        targetSection: 'risk_boundaries',
        currentText: 'max_leverage_ratio: 10',
        proposedText: 'max_leverage_ratio: 8',
        impactAssessment: 'Minor impact',
      });

      expect(amendment).toBeDefined();
    });

    it('returns pending amendments', () => {
      layer.proposeAmendment({
        amendmentType: 'standard_parameter',
        title: 'Test',
        rationale: 'Test',
        proposerAddress: '0xproposer',
        targetSection: 'risk_boundaries',
        currentText: 'max_leverage_ratio: 10',
        proposedText: 'max_leverage_ratio: 8',
        impactAssessment: 'Minor',
      });

      const pending = layer.getPendingAmendments();
      expect(pending.length).toBeGreaterThan(0);
    });

    it('checks if clause can be amended', () => {
      expect(layer.canAmendClause('max_leverage_ratio: 10')).toBe(true);
      const immutable = layer.amendments.getImmutableClauses()[0];
      expect(layer.canAmendClause(immutable)).toBe(false);
    });
  });

  describe('getHealth', () => {
    it('returns healthy status when no emergencies', () => {
      const health: ProtocolConstitutionHealth = layer.getHealth();
      expect(health.overall).toBe('healthy');
      expect(health.constitutionStatus).toBe('ratified');
      expect(health.activeEmergencies).toBe(0);
      expect(health.aiAdvisoryActive).toBe(true);
      expect(health.complianceStatus).toBe('compliant');
    });

    it('returns degraded status with active emergency', () => {
      layer.activateEmergency(
        'oracle_failure',
        'Test emergency',
        '0xcommittee',
        ['trading_halt']
      );

      const health = layer.getHealth();
      expect(health.overall).toBe('degraded');
      expect(health.activeEmergencies).toBe(1);
    });
  });

  describe('event forwarding', () => {
    it('forwards events from all sub-systems', () => {
      const events: ConstitutionEvent[] = [];
      layer.onEvent(e => events.push(e));

      // Trigger events from multiple sub-systems
      layer.createGovernanceProposal({
        title: 'Test',
        description: 'Testing event forwarding',
        proposalType: 'standard',
        proposerAddress: '0xproposer',
        targetBody: 'token_holder_dao',
        actions: [],
      });

      layer.activateEmergency(
        'oracle_failure',
        'Test',
        '0xcommittee',
        ['trading_halt']
      );

      layer.proposeAmendment({
        amendmentType: 'standard_parameter',
        title: 'Test Amendment',
        rationale: 'Test',
        proposerAddress: '0xproposer',
        targetSection: 'risk',
        currentText: 'max_leverage_ratio: 10',
        proposedText: 'max_leverage_ratio: 8',
        impactAssessment: 'Minor',
      });

      // Should have received events from governance, emergency, and amendments
      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'proposal.created')).toBe(true);
      expect(events.some(e => e.type === 'emergency.activated')).toBe(true);
      expect(events.some(e => e.type === 'amendment.proposed')).toBe(true);
    });

    it('unsubscribes event listener', () => {
      const events: ConstitutionEvent[] = [];
      const unsub = layer.onEvent(e => events.push(e));
      unsub();

      layer.createGovernanceProposal({
        title: 'After Unsub',
        description: 'Test',
        proposalType: 'standard',
        proposerAddress: '0xproposer',
        targetBody: 'token_holder_dao',
        actions: [],
      });

      expect(events).toHaveLength(0);
    });
  });
});

// ============================================================================
// 8. Type Exports Smoke Test
// ============================================================================

describe('Type exports', () => {
  it('ProtocolConstitution type structure is correct', () => {
    const layer = createProtocolConstitutionLayer();
    const constitution = layer.getConstitution();

    const keys: (keyof typeof constitution)[] = [
      'id', 'version', 'name', 'preamble',
      'foundationalPrinciples', 'governanceBodies', 'aiAuthoritySpec',
      'riskBoundaries', 'monetaryRules', 'emergencyFramework',
      'amendmentRules', 'complianceSpec', 'status',
    ];

    for (const key of keys) {
      expect(constitution).toHaveProperty(key);
    }
  });
});
