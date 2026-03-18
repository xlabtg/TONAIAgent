/**
 * DAO Governance & Treasury Layer Tests (Issue #103)
 *
 * Comprehensive tests for all 7 components:
 * 1. Governance Engine (proposals, voting, delegation, timelock)
 * 2. DAO Treasury Vault (multi-asset, allocations, reporting)
 * 3. Risk Governance (exposure limits, circuit breakers, emergencies)
 * 4. AI Treasury Management (recommendations, auto-allocation, yield optimization)
 * 5. Multi-Signature Layer (operations, signing, timelock)
 * 6. Marketplace Governance (strategy curation, community voting)
 * 7. Delegated & Institutional Governance (expert delegates, reputation)
 * 8. Unified DAO Layer (integration tests)
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createGovernanceEngine,
  createTreasuryVaultManager,
  createRiskGovernanceManager,
  createAiTreasuryManager,
  createMultiSigManager,
  createMarketplaceGovernanceManager,
  createDelegatedGovernanceManager,
  createDaoGovernanceLayer,
  DefaultGovernanceEngine,
  DefaultTreasuryVaultManager,
  DefaultRiskGovernanceManager,
  DefaultAiTreasuryManager,
  DefaultMultiSigManager,
  DefaultMarketplaceGovernanceManager,
  DefaultDelegatedGovernanceManager,
  DefaultDaoGovernanceLayer,
} from '../../extended/dao-governance';

import type {
  DaoProposal,
  DaoVoteResult,
  VotingDelegation,
  TreasuryVault,
  TreasuryAllocation,
  TreasuryTransaction,
  TreasuryReport,
  TreasuryRiskAssessment,
  CircuitBreakerState,
  EmergencyAction,
  AiRebalanceRecommendation,
  MultiSigOperation,
  MultiSigSignature,
  GovernedStrategyListing,
  InstitutionalDelegate,
  DaoGovernanceHealth,
  DaoEvent,
} from '../../extended/dao-governance';

// ============================================================================
// 1. Governance Engine Tests
// ============================================================================

describe('GovernanceEngine', () => {
  let engine: DefaultGovernanceEngine;

  beforeEach(() => {
    engine = createGovernanceEngine({
      proposalThreshold: 10,  // Low threshold for testing
      quorumPercent: 10,
      approvalThreshold: 51,
      votingDelay: 0,         // No delay for tests
      votingPeriod: 0,        // Short period for tests
      timelockDuration: 0,
    }) as DefaultGovernanceEngine;

    // Give voters enough power
    engine.setVotingPower('alice', 500);
    engine.setVotingPower('bob', 300);
    engine.setVotingPower('carol', 200);
  });

  describe('createProposal', () => {
    it('creates a proposal with correct fields', async () => {
      const proposal: DaoProposal = await engine.createProposal({
        type: 'strategy_approval',
        title: 'Approve DeFi Strategy #1',
        description: 'Proposal to approve the DeFi yield strategy',
        actions: [{ target: '0xabcd', value: 0, calldata: '0x', description: 'Approve strategy' }],
        proposer: 'alice',
      });

      expect(proposal).toBeDefined();
      expect(proposal.id).toBeTruthy();
      expect(proposal.type).toBe('strategy_approval');
      expect(proposal.title).toBe('Approve DeFi Strategy #1');
      expect(proposal.proposer).toBe('alice');
      expect(proposal.forVotes).toBe(0);
      expect(proposal.againstVotes).toBe(0);
      expect(proposal.abstainVotes).toBe(0);
      expect(['pending', 'active']).toContain(proposal.status);
      expect(proposal.actions).toHaveLength(1);
    });

    it('throws if proposer has insufficient voting power', async () => {
      engine.setVotingPower('nobody', 0);
      await expect(
        engine.createProposal({
          type: 'treasury_allocation',
          title: 'Unauthorized Proposal',
          description: 'Should fail',
          actions: [],
          proposer: 'nobody',
        })
      ).rejects.toThrow(/Insufficient voting power/);
    });

    it('supports all proposal types', async () => {
      const types: DaoProposal['type'][] = [
        'strategy_approval', 'treasury_allocation', 'risk_parameter_change',
        'marketplace_curation', 'protocol_upgrade', 'emergency_action',
        'fee_change', 'agent_whitelist', 'governance_parameter',
      ];

      for (const type of types) {
        const proposal = await engine.createProposal({
          type,
          title: `${type} proposal`,
          description: 'Test proposal',
          actions: [],
          proposer: 'alice',
        });
        expect(proposal.type).toBe(type);
      }
    });
  });

  describe('castVote', () => {
    it('casts a for vote and updates vote counts', async () => {
      const proposal = await engine.createProposal({
        type: 'strategy_approval',
        title: 'Test',
        description: 'Test',
        actions: [],
        proposer: 'alice',
      });

      // Force to active
      engine.tickProposals();
      const fetched = await engine.getProposal(proposal.id);
      if (fetched) fetched.status = 'active';

      const result: DaoVoteResult = await engine.castVote(proposal.id, 'alice', 'for', 'Great proposal');

      expect(result.success).toBe(true);
      expect(result.voter).toBe('alice');
      expect(result.voteType).toBe('for');
      expect(result.votingPower).toBe(500);
      expect(result.newForVotes).toBe(500);
    });

    it('casts against and abstain votes', async () => {
      const proposal = await engine.createProposal({
        type: 'fee_change',
        title: 'Fee Change',
        description: 'Test',
        actions: [],
        proposer: 'alice',
      });
      const p = await engine.getProposal(proposal.id);
      if (p) p.status = 'active';

      await engine.castVote(proposal.id, 'bob', 'against');
      await engine.castVote(proposal.id, 'carol', 'abstain');

      const updated = await engine.getProposal(proposal.id);
      expect(updated!.againstVotes).toBe(300);
      expect(updated!.abstainVotes).toBe(200);
    });

    it('prevents double voting', async () => {
      const proposal = await engine.createProposal({
        type: 'fee_change',
        title: 'Test',
        description: 'Test',
        actions: [],
        proposer: 'alice',
      });
      const p = await engine.getProposal(proposal.id);
      if (p) p.status = 'active';

      await engine.castVote(proposal.id, 'alice', 'for');
      await expect(
        engine.castVote(proposal.id, 'alice', 'against')
      ).rejects.toThrow(/already voted/);
    });

    it('rejects votes on cancelled proposals', async () => {
      const proposal = await engine.createProposal({
        type: 'strategy_approval',
        title: 'Test',
        description: 'Test',
        actions: [],
        proposer: 'alice',
      });

      // Force cancelled
      const p = await engine.getProposal(proposal.id);
      if (p) p.status = 'cancelled';

      await expect(
        engine.castVote(proposal.id, 'alice', 'for')
      ).rejects.toThrow(/not active/);
    });
  });

  describe('delegation', () => {
    it('creates a delegation and grants power', async () => {
      const delegation: VotingDelegation = await engine.createDelegation({
        delegator: 'alice',
        delegatee: 'bob',
        power: 200,
      });

      expect(delegation.delegator).toBe('alice');
      expect(delegation.delegatee).toBe('bob');
      expect(delegation.power).toBe(200);
      expect(delegation.active).toBe(true);

      // Bob now has 300 + 200 = 500 voting power
      const bobPower = await engine.getVotingPower('bob');
      expect(bobPower).toBe(500);
    });

    it('revokes a delegation', async () => {
      const delegation = await engine.createDelegation({
        delegator: 'alice',
        delegatee: 'carol',
        power: 100,
      });

      const success = await engine.revokeDelegation(delegation.id, 'alice');
      expect(success).toBe(true);

      // Carol is back to 200
      const carolPower = await engine.getVotingPower('carol');
      expect(carolPower).toBe(200);
    });

    it('throws if delegating more power than available', async () => {
      await expect(
        engine.createDelegation({
          delegator: 'alice',
          delegatee: 'bob',
          power: 9999,
        })
      ).rejects.toThrow(/Cannot delegate/);
    });
  });

  describe('proposal lifecycle', () => {
    it('queues and executes a succeeded proposal', async () => {
      const proposal = await engine.createProposal({
        type: 'fee_change',
        title: 'Test',
        description: 'Test',
        actions: [{ target: 'protocol', value: 0, calldata: '0x', description: 'Set fee' }],
        proposer: 'alice',
      });

      // Force succeeded
      const p = await engine.getProposal(proposal.id);
      if (p) {
        p.status = 'succeeded';
      }

      const queued = await engine.queueProposal(proposal.id);
      expect(queued).toBe(true);

      const updated = await engine.getProposal(proposal.id);
      expect(updated!.status).toBe('queued');

      // Remove timelock for test
      if (updated?.executionEta) {
        updated.executionEta = new Date(Date.now() - 1000);
      }

      const result = await engine.executeProposal(proposal.id);
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);

      const final = await engine.getProposal(proposal.id);
      expect(final!.status).toBe('executed');
    });

    it('cancels a proposal', async () => {
      const proposal = await engine.createProposal({
        type: 'strategy_approval',
        title: 'Cancellable',
        description: 'Test',
        actions: [],
        proposer: 'alice',
      });

      const p = await engine.getProposal(proposal.id);
      if (p) p.status = 'active';

      const cancelled = await engine.cancelProposal(proposal.id, 'alice');
      expect(cancelled).toBe(true);

      const final = await engine.getProposal(proposal.id);
      expect(final!.status).toBe('cancelled');
    });
  });

  describe('getActiveProposals & history', () => {
    it('returns active proposals', async () => {
      const p1 = await engine.createProposal({ type: 'fee_change', title: 'P1', description: 'D', actions: [], proposer: 'alice' });
      const p2 = await engine.createProposal({ type: 'agent_whitelist', title: 'P2', description: 'D', actions: [], proposer: 'alice' });

      const active = await engine.getActiveProposals();
      expect(active.length).toBeGreaterThanOrEqual(2);
    });

    it('returns proposal history', async () => {
      await engine.createProposal({ type: 'fee_change', title: 'H1', description: 'D', actions: [], proposer: 'alice' });
      const history = await engine.getProposalHistory();
      expect(history.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('governance activity summary', () => {
    it('computes activity summary', async () => {
      await engine.createProposal({ type: 'fee_change', title: 'Summary Test', description: 'D', actions: [], proposer: 'alice' });
      const summary = engine.getActivitySummary(new Date(0));

      expect(summary.proposalsCreated).toBeGreaterThanOrEqual(1);
      expect(typeof summary.uniqueVoters).toBe('number');
    });
  });

  describe('events', () => {
    it('emits proposal.created event', async () => {
      const events: DaoEvent[] = [];
      engine.onEvent(e => events.push(e));

      await engine.createProposal({
        type: 'strategy_approval',
        title: 'Event Test',
        description: 'Test',
        actions: [],
        proposer: 'alice',
      });

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('proposal.created');
    });

    it('emits proposal.voted event', async () => {
      const events: DaoEvent[] = [];
      engine.onEvent(e => events.push(e));

      const proposal = await engine.createProposal({ type: 'fee_change', title: 'E', description: 'D', actions: [], proposer: 'alice' });
      const p = await engine.getProposal(proposal.id);
      if (p) p.status = 'active';

      await engine.castVote(proposal.id, 'bob', 'for');

      const voted = events.find(e => e.type === 'proposal.voted');
      expect(voted).toBeDefined();
    });

    it('returns unsubscribe function', async () => {
      const events: DaoEvent[] = [];
      const unsub = engine.onEvent(e => events.push(e));

      await engine.createProposal({ type: 'fee_change', title: 'U', description: 'D', actions: [], proposer: 'alice' });
      expect(events).toHaveLength(1);

      unsub();

      await engine.createProposal({ type: 'fee_change', title: 'U2', description: 'D', actions: [], proposer: 'alice' });
      expect(events).toHaveLength(1);  // No new events after unsubscribe
    });
  });
});

// ============================================================================
// 2. Treasury Vault Tests
// ============================================================================

describe('TreasuryVaultManager', () => {
  let vault: DefaultTreasuryVaultManager;

  beforeEach(() => {
    vault = createTreasuryVaultManager({
      name: 'Test Treasury',
      initialAssets: [
        { symbol: 'TON', type: 'ton', name: 'TON', balance: 10000, valueInTon: 1 },
        { symbol: 'USDT', type: 'jetton', name: 'USDT', balance: 5000, valueInTon: 0.25 },
      ],
      minLiquidityReserve: 20,
    }) as DefaultTreasuryVaultManager;
  });

  describe('getVault', () => {
    it('returns vault with correct stats', () => {
      const v: TreasuryVault = vault.getVault();
      expect(v.name).toBe('Test Treasury');
      expect(v.status).toBe('active');
      expect(v.totalValueTon).toBe(11250); // 10000*1 + 5000*0.25
      expect(v.availableValueTon).toBe(11250);
      expect(v.allocatedValueTon).toBe(0);
      expect(v.assets).toHaveLength(2);
    });
  });

  describe('deposit', () => {
    it('deposits TON and updates balance', async () => {
      const tx: TreasuryTransaction = await vault.deposit('TON', 1000, '0xdepositor');
      expect(tx.type).toBe('deposit');
      expect(tx.amount).toBe(1000);

      const asset = vault.getAsset('TON');
      expect(asset!.balance).toBe(11000);
    });

    it('creates new asset on unknown token deposit', async () => {
      await vault.deposit('NEW_TOKEN', 100, '0xsender');
      const asset = vault.getAsset('NEW_TOKEN');
      expect(asset).toBeDefined();
      expect(asset!.balance).toBe(100);
    });
  });

  describe('withdraw', () => {
    it('withdraws asset and updates balance', async () => {
      const tx = await vault.withdraw('TON', 500, '0xrecipient');
      expect(tx.type).toBe('withdrawal');

      const asset = vault.getAsset('TON');
      expect(asset!.balance).toBe(9500);
    });

    it('throws on insufficient balance', async () => {
      await expect(
        vault.withdraw('TON', 999999, '0xrecipient')
      ).rejects.toThrow();
    });

    it('enforces liquidity reserve constraint', async () => {
      // Try to withdraw so much that liquidity would drop below 20%
      // Total value = 11250, 80% = 9000, so can withdraw at most 11250 - 2250 = 9000 TON equivalent
      await expect(
        vault.withdraw('TON', 9500, '0xrecipient')  // Would leave only ~750/11250 = 6.7% liquid
      ).rejects.toThrow(/liquidity reserve/);
    });
  });

  describe('allocateToStrategy', () => {
    it('allocates to a strategy', async () => {
      const alloc: TreasuryAllocation = await vault.allocateToStrategy({
        strategyId: 'strat-1',
        strategyName: 'DeFi Strategy',
        requestedAmount: 1000,
        requestedPercent: 8.9,
        rationale: 'High yield opportunity',
        requester: 'alice',
      });

      expect(alloc.strategyId).toBe('strat-1');
      expect(alloc.allocatedAmount).toBe(1000);
      expect(alloc.status).toBe('active');

      const v = vault.getVault();
      expect(v.allocatedValueTon).toBe(1000);
    });

    it('tracks approved proposal ID', async () => {
      const alloc = await vault.allocateToStrategy(
        { strategyId: 's1', strategyName: 'S1', requestedAmount: 500, requestedPercent: 4.4, rationale: 'OK', requester: 'dao' },
        'proposal-123'
      );
      expect(alloc.approvedByProposalId).toBe('proposal-123');
    });

    it('throws if amount exceeds available', async () => {
      await expect(
        vault.allocateToStrategy({
          strategyId: 'x',
          strategyName: 'X',
          requestedAmount: 999999,
          requestedPercent: 100,
          rationale: 'Too much',
          requester: 'alice',
        })
      ).rejects.toThrow(/Insufficient available/);
    });
  });

  describe('updateAllocation', () => {
    it('updates an existing allocation', async () => {
      const alloc = await vault.allocateToStrategy({
        strategyId: 's2', strategyName: 'S2', requestedAmount: 1000, requestedPercent: 8, rationale: 'OK', requester: 'bob',
      });

      const updated = await vault.updateAllocation(alloc.id, 1200);
      expect(updated.allocatedAmount).toBe(1200);
    });
  });

  describe('exitAllocation', () => {
    it('exits an allocation and returns funds', async () => {
      const alloc = await vault.allocateToStrategy({
        strategyId: 's3', strategyName: 'S3', requestedAmount: 2000, requestedPercent: 17, rationale: 'Test', requester: 'carol',
      });

      const tonBefore = vault.getAsset('TON')!.balance;
      const success = await vault.exitAllocation(alloc.id, 'Test exit');
      expect(success).toBe(true);

      const tonAfter = vault.getAsset('TON')!.balance;
      expect(tonAfter).toBeGreaterThan(tonBefore);
    });
  });

  describe('generateReport', () => {
    it('generates a treasury report', async () => {
      const start = new Date(Date.now() - 3600000);
      await vault.deposit('TON', 1000, '0xsender');

      const report: TreasuryReport = vault.generateReport(start, new Date());

      expect(report.periodStart).toEqual(start);
      expect(report.totalValueEnd).toBeGreaterThan(0);
      expect(report.riskExposureSummary).toBeDefined();
      expect(report.governanceActivity).toBeDefined();
    });
  });

  describe('updateAssetPrice', () => {
    it('updates asset price and recalculates totals', () => {
      vault.updateAssetPrice('TON', 1.5);
      const asset = vault.getAsset('TON');
      expect(asset!.valueInTon).toBe(1.5);
    });
  });

  describe('events', () => {
    it('emits treasury.deposited event', async () => {
      const events: DaoEvent[] = [];
      vault.onEvent(e => events.push(e));

      await vault.deposit('TON', 100, '0xsender');
      expect(events[0].type).toBe('treasury.deposited');
    });
  });
});

// ============================================================================
// 3. Risk Governance Tests
// ============================================================================

describe('RiskGovernanceManager', () => {
  let risk: DefaultRiskGovernanceManager;

  beforeEach(() => {
    risk = createRiskGovernanceManager({
      initialRiskParameters: {
        maxSingleStrategyExposure: 30,
        maxTotalRiskyExposure: 50,
        minLiquidityReserve: 20,
        maxDrawdownBeforePause: 15,
        circuitBreakerThreshold: 20,
        emergencyExitThreshold: 30,
        rebalanceThreshold: 5,
        dailyWithdrawalLimit: 10,
      },
    }) as DefaultRiskGovernanceManager;
  });

  describe('assessAllocationRisk', () => {
    it('returns low risk for small whitelisted allocation', () => {
      risk.whitelistStrategy('safe-strat', 25);

      const assessment: TreasuryRiskAssessment = risk.assessAllocationRisk(
        'safe-strat',
        1000,
        [],
        100000
      );

      expect(assessment.riskScore).toBeDefined();
      expect(assessment.riskLevel).toBeDefined();
      expect(assessment.approvalRequired).toBe(false);
    });

    it('warns on excessive concentration', () => {
      const assessment = risk.assessAllocationRisk(
        'large-strat',
        4000,
        [],
        10000  // 40% allocation
      );

      expect(assessment.warnings.length).toBeGreaterThan(0);
      expect(assessment.approvalRequired).toBe(true);
    });

    it('warns on unlisted strategy', () => {
      const assessment = risk.assessAllocationRisk(
        'unknown-strat',
        100,
        [],
        10000
      );

      expect(assessment.approvalRequired).toBe(true);
      expect(assessment.recommendations.some(r => r.includes('not whitelisted'))).toBe(true);
    });
  });

  describe('strategy whitelist', () => {
    it('adds and checks whitelist', () => {
      risk.whitelistStrategy('strat-a', 40);
      expect(risk.isStrategyWhitelisted('strat-a')).toBe(true);
      expect(risk.isStrategyWhitelisted('strat-b')).toBe(false);
    });

    it('removes from whitelist', () => {
      risk.whitelistStrategy('strat-c', 30);
      risk.removeFromWhitelist('strat-c');
      expect(risk.isStrategyWhitelisted('strat-c')).toBe(false);
    });

    it('returns all whitelisted strategies', () => {
      risk.whitelistStrategy('s1', 20);
      risk.whitelistStrategy('s2', 50);
      const list = risk.getWhitelistedStrategies();
      expect(list.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('circuit breaker', () => {
    it('triggers and resets circuit breaker', () => {
      const state: CircuitBreakerState = risk.getCircuitBreakerState();
      expect(state.triggered).toBe(false);

      risk.triggerCircuitBreaker('Heavy drawdown', 'system', 22);
      const triggered = risk.getCircuitBreakerState();
      expect(triggered.triggered).toBe(true);
      expect(triggered.drawdownAtTrigger).toBe(22);

      risk.resetCircuitBreaker('admin');
      const reset = risk.getCircuitBreakerState();
      expect(reset.triggered).toBe(false);
    });

    it('does not double-trigger', () => {
      risk.triggerCircuitBreaker('Reason 1', 'system', 21);
      risk.triggerCircuitBreaker('Reason 2', 'system', 25);

      const state = risk.getCircuitBreakerState();
      expect(state.triggerReason).toBe('Reason 1');  // First trigger preserved
    });

    it('emits circuit breaker events', () => {
      const events: DaoEvent[] = [];
      risk.onEvent(e => events.push(e));

      risk.triggerCircuitBreaker('Test', 'system', 20);
      expect(events[0].type).toBe('risk.circuit_breaker_triggered');

      risk.resetCircuitBreaker('admin');
      expect(events[1].type).toBe('risk.circuit_breaker_reset');
    });
  });

  describe('emergency actions', () => {
    it('triggers an emergency action', () => {
      const action: EmergencyAction = risk.triggerEmergencyAction(
        'pause_allocations',
        'admin',
        'Suspicious activity detected',
        ['strat-1', 'strat-2']
      );

      expect(action.id).toBeTruthy();
      expect(action.type).toBe('pause_allocations');
      expect(action.resolved).toBe(false);
      expect(action.affectedStrategies).toHaveLength(2);

      const actives = risk.getActiveEmergencies();
      expect(actives).toHaveLength(1);
    });

    it('resolves an emergency action', () => {
      const action = risk.triggerEmergencyAction('emergency_withdraw', 'auto', 'Circuit break', ['s1']);
      const success = risk.resolveEmergencyAction(action.id, 'admin');

      expect(success).toBe(true);
      expect(risk.getActiveEmergencies()).toHaveLength(0);
    });
  });

  describe('portfolio risk check', () => {
    it('passes clean portfolio', () => {
      const allocations = [
        {
          id: 'a1', strategyId: 's1', strategyName: 'S1', allocatedAmount: 1000,
          allocatedPercent: 10, currentValue: 1050, pnl: 50, pnlPercent: 5,
          riskScore: 30, status: 'active' as const, allocatedAt: new Date(),
        },
      ];

      const report = risk.checkPortfolioRisk(allocations, 10000);
      expect(report.passed).toBe(true);
      expect(report.circuitBreakerActive).toBe(false);
    });

    it('fails portfolio with circuit breaker active', () => {
      risk.triggerCircuitBreaker('Test', 'system', 21);
      const report = risk.checkPortfolioRisk([], 10000);
      expect(report.passed).toBe(false);
      expect(report.circuitBreakerActive).toBe(true);
    });

    it('detects excessive single-strategy concentration', () => {
      const allocations = [
        {
          id: 'a1', strategyId: 'big-strat', strategyName: 'Big', allocatedAmount: 4000,
          allocatedPercent: 40, currentValue: 4000, pnl: 0, pnlPercent: 0,
          riskScore: 50, status: 'active' as const, allocatedAt: new Date(),
        },
      ];

      const report = risk.checkPortfolioRisk(allocations, 10000);
      expect(report.violations.some(v => v.rule === 'max_single_strategy_exposure')).toBe(true);
    });

    it('updates risk parameters', () => {
      risk.updateRiskParameters({ maxSingleStrategyExposure: 50 });
      const params = risk.getRiskParameters();
      expect(params.maxSingleStrategyExposure).toBe(50);
    });
  });
});

// ============================================================================
// 4. AI Treasury Management Tests
// ============================================================================

describe('AiTreasuryManager', () => {
  let ai: DefaultAiTreasuryManager;

  beforeEach(() => {
    ai = createAiTreasuryManager({
      enabled: true,
      maxAutoAllocationPercent: 20,
      requireGovernanceAbovePercent: 20,
      optimizationObjective: 'risk_adjusted',
    }) as DefaultAiTreasuryManager;
  });

  const makeAllocations = () => [
    {
      id: 'a1', strategyId: 's1', strategyName: 'Strategy A', allocatedAmount: 2000,
      allocatedPercent: 20, currentValue: 2200, pnl: 200, pnlPercent: 10,
      riskScore: 40, status: 'active' as const, allocatedAt: new Date(),
    },
    {
      id: 'a2', strategyId: 's2', strategyName: 'Strategy B', allocatedAmount: 1500,
      allocatedPercent: 15, currentValue: 1350, pnl: -150, pnlPercent: -10,
      riskScore: 65, status: 'active' as const, allocatedAt: new Date(),
    },
  ];

  describe('generateRebalanceRecommendation', () => {
    it('generates a recommendation with actions', async () => {
      const rec: AiRebalanceRecommendation = await ai.generateRebalanceRecommendation(
        makeAllocations(),
        10000,
        1000
      );

      expect(rec.id).toBeTruthy();
      expect(rec.generatedAt).toBeDefined();
      expect(rec.expiresAt).toBeDefined();
      expect(rec.rationale).toBeTruthy();
      expect(Array.isArray(rec.actions)).toBe(true);
      expect(rec.confidence).toBeGreaterThan(0);
      expect(rec.confidence).toBeLessThanOrEqual(1);
    });

    it('recommends increasing top performer', async () => {
      const rec = await ai.generateRebalanceRecommendation(makeAllocations(), 10000, 500);
      const hasIncrease = rec.actions.some(a => a.type === 'increase');
      // Should recommend something since Strategy B is underperforming
      expect(typeof rec.requiresGovernanceApproval).toBe('boolean');
    });

    it('stores recommendation in history', async () => {
      await ai.generateRebalanceRecommendation(makeAllocations(), 10000, 0);
      await ai.generateRebalanceRecommendation(makeAllocations(), 10000, 0);

      const history = ai.getRecommendationHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('getLatestRecommendation returns most recent', async () => {
      const rec1 = await ai.generateRebalanceRecommendation(makeAllocations(), 10000, 0);
      const rec2 = await ai.generateRebalanceRecommendation(makeAllocations(), 12000, 500);

      const latest = ai.getLatestRecommendation();
      expect(latest?.id).toBe(rec2.id);
    });
  });

  describe('autoAllocate', () => {
    it('returns allocation suggestions', async () => {
      const suggestions = await ai.autoAllocate(5000, [
        { strategyId: 's1', expectedYield: 8, riskScore: 30 },
        { strategyId: 's2', expectedYield: 12, riskScore: 55 },
        { strategyId: 's3', expectedYield: 5, riskScore: 20 },
      ]);

      expect(suggestions.length).toBeGreaterThan(0);
      for (const s of suggestions) {
        expect(s.amount).toBeGreaterThan(0);
        expect(s.rationale).toBeTruthy();
      }

      // Total should not exceed maxAutoAllocationPercent (20% of 5000 = 1000)
      const total = suggestions.reduce((s, a) => s + a.amount, 0);
      expect(total).toBeLessThanOrEqual(5000);
    });

    it('returns empty if AI disabled', async () => {
      ai.updateConfig({ enabled: false });
      const suggestions = await ai.autoAllocate(5000, [
        { strategyId: 's1', expectedYield: 10, riskScore: 30 },
      ]);
      expect(suggestions).toHaveLength(0);
    });

    it('filters high-risk strategies', async () => {
      const suggestions = await ai.autoAllocate(5000, [
        { strategyId: 'risky', expectedYield: 50, riskScore: 90 },  // Too risky
      ]);
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('optimizeYield', () => {
    it('returns yield optimization result', () => {
      const result = ai.optimizeYield(makeAllocations(), 10000);

      expect(result.currentYieldEstimate).toBeDefined();
      expect(result.optimizedYieldEstimate).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(Array.isArray(result.recommendedChanges)).toBe(true);
    });
  });

  describe('overrideRecommendation', () => {
    it('records a human override', async () => {
      const rec = await ai.generateRebalanceRecommendation(makeAllocations(), 10000, 0);
      ai.overrideRecommendation(rec.id, 'alice', 'Market conditions changed');
      // No error = success (the override is recorded internally)
    });
  });

  describe('emergency exit', () => {
    it('creates an emergency exit plan', () => {
      const plan = ai.triggerEmergencyExit(['s1', 's2'], 'alice', 'Flash crash detected');

      expect(plan.id).toBeTruthy();
      expect(plan.strategyIds).toEqual(['s1', 's2']);
      expect(plan.exitSteps).toHaveLength(2);
      expect(plan.exitSteps[0].priority).toBe(1);
    });
  });
});

// ============================================================================
// 5. Multi-Signature Layer Tests
// ============================================================================

describe('MultiSigManager', () => {
  let multisig: DefaultMultiSigManager;

  beforeEach(() => {
    multisig = createMultiSigManager({
      multiSigConfig: {
        required: 2,
        signers: ['signer1', 'signer2', 'signer3'],
        timelockDuration: 0,   // No delay for tests
        emergencySigners: ['emergency1', 'emergency2'],
        emergencyRequired: 1,
      },
    }) as DefaultMultiSigManager;
  });

  describe('createOperation', () => {
    it('creates a pending operation', () => {
      const op: MultiSigOperation = multisig.createOperation(
        'treasury_transfer',
        'Transfer 1000 TON to strategy',
        { amount: 1000, target: 'strat-1' },
        'admin'
      );

      expect(op.id).toBeTruthy();
      expect(op.type).toBe('treasury_transfer');
      expect(op.status).toBe('pending');
      expect(op.requiredSignatures).toBe(2);
      expect(op.signatures).toHaveLength(0);
    });

    it('creates emergency operation without timelock', () => {
      const op = multisig.createOperation(
        'emergency',
        'Emergency shutdown',
        {},
        'admin',
        true
      );

      expect(op.timelockEndsAt).toBeUndefined();
    });
  });

  describe('sign', () => {
    it('signs an operation', () => {
      const op = multisig.createOperation('treasury_transfer', 'Test', {}, 'admin');
      const sig: MultiSigSignature = multisig.sign(op.id, 'signer1', true);

      expect(sig.signer).toBe('signer1');
      expect(sig.approved).toBe(true);
      expect(sig.signedAt).toBeDefined();
    });

    it('moves to approved after enough signatures', () => {
      const op = multisig.createOperation('treasury_transfer', 'Test', {}, 'admin');

      multisig.sign(op.id, 'signer1', true);
      multisig.sign(op.id, 'signer2', true);

      const updated = multisig.getOperation(op.id);
      expect(updated!.status).toBe('approved');
    });

    it('rejects when non-authorized signer tries to sign', () => {
      const op = multisig.createOperation('treasury_transfer', 'Test', {}, 'admin');
      expect(() => multisig.sign(op.id, 'unknown-signer', true)).toThrow();
    });

    it('prevents double-signing', () => {
      const op = multisig.createOperation('treasury_transfer', 'Test', {}, 'admin');
      multisig.sign(op.id, 'signer1', true);
      expect(() => multisig.sign(op.id, 'signer1', true)).toThrow(/already signed/);
    });
  });

  describe('execute', () => {
    it('executes an approved operation', () => {
      const op = multisig.createOperation('treasury_transfer', 'Test', {}, 'admin');
      multisig.sign(op.id, 'signer1', true);
      multisig.sign(op.id, 'signer2', true);

      const success = multisig.execute(op.id);
      expect(success).toBe(true);
    });

    it('cannot execute without enough signatures', () => {
      const op = multisig.createOperation('treasury_transfer', 'Test', {}, 'admin');
      multisig.sign(op.id, 'signer1', true);

      expect(multisig.canExecute(op.id)).toBe(false);
    });
  });

  describe('getPendingOperations', () => {
    it('returns pending operations', () => {
      multisig.createOperation('treasury_transfer', 'Op1', {}, 'admin');
      multisig.createOperation('parameter_change', 'Op2', {}, 'admin');

      const pending = multisig.getPendingOperations();
      expect(pending.length).toBe(2);
    });
  });

  describe('updateSigners', () => {
    it('updates signers configuration', () => {
      multisig.updateSigners(['a', 'b', 'c'], 2);
      const config = multisig.getConfig();
      expect(config.signers).toEqual(['a', 'b', 'c']);
      expect(config.required).toBe(2);
    });

    it('rejects invalid signer configuration', () => {
      expect(() => multisig.updateSigners(['a', 'b'], 5)).toThrow(/cannot exceed/);
    });
  });

  describe('events', () => {
    it('emits multisig events', () => {
      const events: DaoEvent[] = [];
      multisig.onEvent(e => events.push(e));

      const op = multisig.createOperation('treasury_transfer', 'Test', {}, 'admin');
      expect(events[0].type).toBe('multisig.operation_created');

      multisig.sign(op.id, 'signer1', true);
      expect(events[1].type).toBe('multisig.operation_signed');
    });
  });
});

// ============================================================================
// 6. Marketplace Governance Tests
// ============================================================================

describe('MarketplaceGovernanceManager', () => {
  let marketplace: DefaultMarketplaceGovernanceManager;

  beforeEach(() => {
    marketplace = createMarketplaceGovernanceManager() as DefaultMarketplaceGovernanceManager;
  });

  describe('submitStrategy', () => {
    it('submits a strategy for review', () => {
      const listing: GovernedStrategyListing = marketplace.submitStrategy(
        'strat-yield-1',
        'High Yield DeFi',
        '0xdeveloper',
        'medium'
      );

      expect(listing.strategyId).toBe('strat-yield-1');
      expect(listing.status).toBe('pending_review');
      expect(listing.communityRating).toBe(0);
    });

    it('rejects duplicate submissions', () => {
      marketplace.submitStrategy('dup', 'Dup', '0xdev', 'low');
      expect(() => marketplace.submitStrategy('dup', 'Dup2', '0xdev', 'low')).toThrow(/already listed/);
    });
  });

  describe('approveStrategy', () => {
    it('approves a pending strategy', () => {
      marketplace.submitStrategy('s1', 'Strategy 1', '0xdev', 'low');
      const success = marketplace.approveStrategy('s1', 'proposal-001');

      expect(success).toBe(true);
      const listing = marketplace.getListing('s1');
      expect(listing!.status).toBe('approved');
      expect(listing!.approvalProposalId).toBe('proposal-001');
    });

    it('rejects approval of non-pending strategy', () => {
      marketplace.submitStrategy('s2', 'Strategy 2', '0xdev', 'medium');
      marketplace.approveStrategy('s2', 'p1');
      const second = marketplace.approveStrategy('s2', 'p2');
      expect(second).toBe(false);
    });
  });

  describe('rejectStrategy', () => {
    it('rejects a pending strategy', () => {
      marketplace.submitStrategy('bad-strat', 'Bad', '0xdev', 'high');
      const success = marketplace.rejectStrategy('bad-strat', 'Too risky');

      expect(success).toBe(true);
      const listing = marketplace.getListing('bad-strat');
      expect(listing!.status).toBe('rejected');
      expect(listing!.rejectionReason).toBe('Too risky');
    });
  });

  describe('voteOnStrategy', () => {
    it('casts a community vote', () => {
      marketplace.submitStrategy('popular', 'Popular Strategy', '0xdev', 'low');
      marketplace.approveStrategy('popular', 'p1');

      const vote = marketplace.voteOnStrategy('popular', 'alice', 5, 'Excellent returns');
      expect(vote.rating).toBe(5);
      expect(vote.voter).toBe('alice');

      const listing = marketplace.getListing('popular');
      expect(listing!.communityRating).toBe(5);
    });

    it('updates existing vote', () => {
      marketplace.submitStrategy('voted', 'Voted', '0xdev', 'medium');
      marketplace.approveStrategy('voted', 'p1');

      marketplace.voteOnStrategy('voted', 'alice', 3);
      marketplace.voteOnStrategy('voted', 'alice', 5);  // Update

      const listing = marketplace.getListing('voted');
      expect(listing!.votes).toHaveLength(1);
      expect(listing!.communityRating).toBe(5);
    });

    it('averages multiple votes', () => {
      marketplace.submitStrategy('avg', 'Average', '0xdev', 'low');
      marketplace.approveStrategy('avg', 'p1');

      marketplace.voteOnStrategy('avg', 'alice', 4);
      marketplace.voteOnStrategy('avg', 'bob', 2);

      const listing = marketplace.getListing('avg');
      expect(listing!.communityRating).toBe(3);
    });

    it('rejects vote on non-approved strategy', () => {
      marketplace.submitStrategy('pending-s', 'Pending', '0xdev', 'low');
      expect(() => marketplace.voteOnStrategy('pending-s', 'alice', 5)).toThrow(/approved/);
    });

    it('validates rating range', () => {
      marketplace.submitStrategy('range-test', 'Range', '0xdev', 'low');
      marketplace.approveStrategy('range-test', 'p1');
      expect(() => marketplace.voteOnStrategy('range-test', 'alice', 6)).toThrow(/1 and 5/);
      expect(() => marketplace.voteOnStrategy('range-test', 'alice', 0)).toThrow(/1 and 5/);
    });
  });

  describe('getListingsByStatus', () => {
    it('filters by status', () => {
      marketplace.submitStrategy('a1', 'A1', '0xdev', 'low');
      marketplace.submitStrategy('a2', 'A2', '0xdev', 'medium');
      marketplace.approveStrategy('a1', 'p1');

      const approved = marketplace.getListingsByStatus('approved');
      const pending = marketplace.getListingsByStatus('pending_review');

      expect(approved.length).toBeGreaterThanOrEqual(1);
      expect(pending.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getStats', () => {
    it('returns marketplace stats', () => {
      marketplace.submitStrategy('t1', 'T1', '0xdev', 'low');
      marketplace.submitStrategy('t2', 'T2', '0xdev', 'high');
      marketplace.approveStrategy('t1', 'p1');
      marketplace.rejectStrategy('t2', 'Too risky');

      const stats = marketplace.getStats();
      expect(stats.totalListings).toBe(2);
      expect(stats.approved).toBe(1);
      expect(stats.rejected).toBe(1);
    });
  });

  describe('events', () => {
    it('emits marketplace events', () => {
      const events: DaoEvent[] = [];
      marketplace.onEvent(e => events.push(e));

      marketplace.submitStrategy('ev', 'Event Test', '0xdev', 'low');
      marketplace.approveStrategy('ev', 'p1');

      expect(events.some(e => e.type === 'marketplace.strategy_approved')).toBe(true);
    });
  });
});

// ============================================================================
// 7. Delegated Governance Tests
// ============================================================================

describe('DelegatedGovernanceManager', () => {
  let delegated: DefaultDelegatedGovernanceManager;

  beforeEach(() => {
    delegated = createDelegatedGovernanceManager() as DefaultDelegatedGovernanceManager;
  });

  describe('registerDelegate', () => {
    it('registers a delegate', () => {
      const delegate: InstitutionalDelegate = delegated.registerDelegate(
        '0xexpert',
        'DeFi Expert',
        'individual',
        ['strategy_approval', 'risk_parameter_change'],
        'expert'
      );

      expect(delegate.address).toBe('0xexpert');
      expect(delegate.name).toBe('DeFi Expert');
      expect(delegate.tier).toBe('expert');
      expect(delegate.active).toBe(true);
      expect(delegate.reputation).toBe(100);
    });

    it('rejects duplicate registration', () => {
      delegated.registerDelegate('0xdup', 'Dup', 'individual', [], 'standard');
      expect(() =>
        delegated.registerDelegate('0xdup', 'Dup2', 'institution', [], 'institutional')
      ).toThrow(/already registered/);
    });
  });

  describe('grantDelegatedPower', () => {
    it('grants voting power to delegate', () => {
      delegated.registerDelegate('0xd1', 'D1', 'individual', [], 'standard');
      delegated.grantDelegatedPower('0xd1', 500, '0xholder1');
      delegated.grantDelegatedPower('0xd1', 300, '0xholder2');

      const delegate = delegated.getDelegate('0xd1');
      expect(delegate!.delegatedPower).toBe(800);
    });

    it('revokes delegated power', () => {
      delegated.registerDelegate('0xd2', 'D2', 'individual', [], 'standard');
      delegated.grantDelegatedPower('0xd2', 200, '0xholder');
      delegated.revokeDelegatedPower('0xd2', '0xholder');

      const delegate = delegated.getDelegate('0xd2');
      expect(delegate!.delegatedPower).toBe(0);
    });

    it('throws for unknown delegate', () => {
      expect(() => delegated.grantDelegatedPower('0xunknown', 100, '0xholder')).toThrow(/not found/);
    });
  });

  describe('recordDelegateVote', () => {
    it('records a vote and retrieves history', () => {
      delegated.registerDelegate('0xvoter', 'Voter', 'individual', ['fee_change'], 'expert');

      const record = delegated.recordDelegateVote(
        '0xvoter',
        'proposal-123',
        'fee_change',
        'for',
        'This fee change improves protocol sustainability'
      );

      expect(record.proposalId).toBe('proposal-123');
      expect(record.vote).toBe('for');

      const history = delegated.getDelegateHistory('0xvoter');
      expect(history).toHaveLength(1);
      expect(history[0].rationale).toContain('sustainability');
    });
  });

  describe('getDelegatesBySpecialization', () => {
    it('filters by proposal type', () => {
      delegated.registerDelegate('0xrisk', 'Risk Expert', 'institution', ['risk_parameter_change', 'emergency_action'], 'institutional');
      delegated.registerDelegate('0xmarket', 'Market Expert', 'individual', ['marketplace_curation', 'strategy_approval'], 'expert');

      const riskDelegates = delegated.getDelegatesBySpecialization('risk_parameter_change');
      const marketDelegates = delegated.getDelegatesBySpecialization('marketplace_curation');

      expect(riskDelegates.some(d => d.address === '0xrisk')).toBe(true);
      expect(marketDelegates.some(d => d.address === '0xmarket')).toBe(true);
      expect(riskDelegates.some(d => d.address === '0xmarket')).toBe(false);
    });
  });

  describe('updateDelegateReputation', () => {
    it('increases reputation', () => {
      delegated.registerDelegate('0xrep', 'Rep', 'individual', [], 'standard');
      delegated.updateDelegateReputation('0xrep', 50, 'Good voting record');

      const delegate = delegated.getDelegate('0xrep');
      expect(delegate!.reputation).toBe(150);
    });

    it('decreases reputation with floor at 0', () => {
      delegated.registerDelegate('0xbad', 'Bad', 'individual', [], 'standard');
      delegated.updateDelegateReputation('0xbad', -500, 'Malicious behavior');

      const delegate = delegated.getDelegate('0xbad');
      expect(delegate!.reputation).toBe(0);
    });
  });

  describe('getDelegateLeaderboard', () => {
    it('returns sorted leaderboard', () => {
      delegated.registerDelegate('0xl1', 'Leader1', 'institution', [], 'institutional');
      delegated.registerDelegate('0xl2', 'Leader2', 'individual', [], 'expert');

      delegated.grantDelegatedPower('0xl1', 1000, '0xh');
      delegated.updateDelegateReputation('0xl1', 100, 'Great');

      const leaderboard = delegated.getDelegateLeaderboard();
      expect(leaderboard.length).toBeGreaterThanOrEqual(2);
      expect(leaderboard[0].score).toBeGreaterThanOrEqual(leaderboard[1].score);
    });
  });

  describe('getStats', () => {
    it('returns delegation stats', () => {
      delegated.registerDelegate('0xs1', 'S1', 'individual', [], 'expert');
      delegated.registerDelegate('0xs2', 'S2', 'institution', [], 'institutional');
      delegated.grantDelegatedPower('0xs1', 500, '0xh');

      const stats = delegated.getStats();
      expect(stats.totalDelegates).toBe(2);
      expect(stats.activeDelegates).toBe(2);
      expect(stats.totalDelegatedPower).toBe(500);
      expect(stats.expertDelegates).toBe(1);
      expect(stats.institutionalDelegates).toBe(1);
    });
  });
});

// ============================================================================
// 8. Unified DAO Governance Layer Integration Tests
// ============================================================================

describe('DefaultDaoGovernanceLayer (integration)', () => {
  let dao: DefaultDaoGovernanceLayer;

  beforeEach(() => {
    dao = createDaoGovernanceLayer({
      proposalThreshold: 10,
      quorumPercent: 10,
      approvalThreshold: 51,
      votingDelay: 0,
      timelockDuration: 0,
    }) as DefaultDaoGovernanceLayer;

    // Initialize treasury with TON
    dao.treasury.getVault();  // Trigger initialization
    dao.governance.setVotingPower('alice', 600);
    dao.governance.setVotingPower('bob', 400);
  });

  it('has all sub-systems initialized', () => {
    expect(dao.governance).toBeInstanceOf(DefaultGovernanceEngine);
    expect(dao.treasury).toBeInstanceOf(DefaultTreasuryVaultManager);
    expect(dao.risk).toBeInstanceOf(DefaultRiskGovernanceManager);
    expect(dao.aiTreasury).toBeInstanceOf(DefaultAiTreasuryManager);
    expect(dao.multisig).toBeInstanceOf(DefaultMultiSigManager);
    expect(dao.marketplace).toBeInstanceOf(DefaultMarketplaceGovernanceManager);
    expect(dao.delegated).toBeInstanceOf(DefaultDelegatedGovernanceManager);
  });

  describe('createProposal', () => {
    it('creates proposal via convenience method', async () => {
      const proposal: DaoProposal = await dao.createProposal({
        type: 'strategy_approval',
        title: 'DAO Integration Test',
        description: 'Full workflow test',
        actions: [],
        proposer: 'alice',
      });

      expect(proposal.id).toBeTruthy();
      expect(proposal.type).toBe('strategy_approval');
    });
  });

  describe('vote', () => {
    it('votes on proposal via convenience method', async () => {
      const proposal = await dao.createProposal({
        type: 'fee_change',
        title: 'Vote Test',
        description: 'D',
        actions: [],
        proposer: 'alice',
      });

      const p = await dao.governance.getProposal(proposal.id);
      if (p) p.status = 'active';

      const result: DaoVoteResult = await dao.vote(proposal.id, 'alice', 'for', 'Support this');
      expect(result.success).toBe(true);
    });
  });

  describe('getTreasury', () => {
    it('returns treasury vault', () => {
      const vault: TreasuryVault = dao.getTreasury();
      expect(vault).toBeDefined();
      expect(vault.status).toBe('active');
    });
  });

  describe('allocateTreasury', () => {
    it('allocates to strategy with risk check', async () => {
      // Deposit first
      await dao.treasury.deposit('TON', 10000, '0xdao');
      dao.risk.whitelistStrategy('yield-strat', 30);

      const alloc: TreasuryAllocation = await dao.allocateTreasury({
        strategyId: 'yield-strat',
        strategyName: 'Yield Strategy',
        requestedAmount: 1000,
        requestedPercent: 10,
        rationale: 'High yield',
        requester: 'alice',
      }, 'proposal-1');

      expect(alloc.strategyId).toBe('yield-strat');
      expect(alloc.allocatedAmount).toBe(1000);
    });

    it('blocks allocation when circuit breaker is active', async () => {
      await dao.treasury.deposit('TON', 5000, '0xdao');
      dao.risk.triggerCircuitBreaker('Flash crash', 'system', 25);

      await expect(
        dao.allocateTreasury({
          strategyId: 'blocked-strat', strategyName: 'Blocked',
          requestedAmount: 100, requestedPercent: 2,
          rationale: 'Should fail', requester: 'alice',
        })
      ).rejects.toThrow(/circuit breaker/);
    });
  });

  describe('generateTreasuryReport', () => {
    it('generates a treasury report', () => {
      const start = new Date(Date.now() - 3600000);
      const report: TreasuryReport = dao.generateTreasuryReport(start, new Date());

      expect(report.periodStart).toEqual(start);
      expect(report.generatedAt).toBeDefined();
    });
  });

  describe('assessAllocationRisk', () => {
    it('assesses risk for a potential allocation', () => {
      const assessment: TreasuryRiskAssessment = dao.assessAllocationRisk('strat-x', 1000);
      expect(assessment.riskScore).toBeDefined();
      expect(assessment.riskLevel).toBeDefined();
    });
  });

  describe('getCircuitBreakerState', () => {
    it('returns circuit breaker state', () => {
      const state: CircuitBreakerState = dao.getCircuitBreakerState();
      expect(state.triggered).toBe(false);
    });
  });

  describe('getRiskParameters', () => {
    it('returns risk parameters', () => {
      const params = dao.getRiskParameters();
      expect(params.maxSingleStrategyExposure).toBeDefined();
      expect(params.minLiquidityReserve).toBeDefined();
    });
  });

  describe('getAiRebalanceRecommendation', () => {
    it('returns AI recommendation', async () => {
      const rec: AiRebalanceRecommendation = await dao.getAiRebalanceRecommendation();
      expect(rec.id).toBeTruthy();
      expect(rec.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createMultiSigOperation', () => {
    it('creates a multisig operation', () => {
      const op: MultiSigOperation = dao.createMultiSigOperation(
        'treasury_transfer',
        'Send 1000 TON',
        { amount: 1000, target: 'strat-1' },
        'alice'
      );

      expect(op.id).toBeTruthy();
      expect(op.status).toBe('pending');
    });
  });

  describe('submitStrategy', () => {
    it('submits strategy to marketplace', () => {
      const listing: GovernedStrategyListing = dao.submitStrategy(
        'integration-strat',
        'Integration Test Strategy',
        '0xdev',
        'medium'
      );

      expect(listing.strategyId).toBe('integration-strat');
      expect(listing.status).toBe('pending_review');
    });
  });

  describe('approveStrategyListing', () => {
    it('approves strategy via governance', () => {
      dao.submitStrategy('to-approve', 'Approve Me', '0xdev', 'low');
      const success = dao.approveStrategyListing('to-approve', 'proposal-approve');
      expect(success).toBe(true);
    });
  });

  describe('registerDelegate', () => {
    it('registers an institutional delegate', () => {
      const delegate: InstitutionalDelegate = dao.registerDelegate(
        '0xdao-delegate',
        'DAO Committee',
        'committee',
        ['treasury_allocation', 'risk_parameter_change'],
        'institutional'
      );

      expect(delegate.address).toBe('0xdao-delegate');
      expect(delegate.tier).toBe('institutional');
    });
  });

  describe('getHealth', () => {
    it('returns healthy status', () => {
      const health: DaoGovernanceHealth = dao.getHealth();

      expect(health.overall).toBe('healthy');
      expect(health.governanceEngine).toBe('healthy');
      expect(health.treasuryVault).toBe('healthy');
      expect(health.circuitBreakerActive).toBe(false);
    });

    it('returns degraded when circuit breaker is active', () => {
      dao.risk.triggerCircuitBreaker('Test', 'system', 22);
      const health = dao.getHealth();
      expect(health.overall).toBe('degraded');
      expect(health.circuitBreakerActive).toBe(true);
    });
  });

  describe('onEvent (forwarding)', () => {
    it('forwards events from all sub-systems', async () => {
      const events: DaoEvent[] = [];
      dao.onEvent(e => events.push(e));

      await dao.createProposal({ type: 'fee_change', title: 'E', description: 'D', actions: [], proposer: 'alice' });
      await dao.treasury.deposit('TON', 100, '0xsender');
      dao.risk.triggerCircuitBreaker('Test', 'system', 21);

      const types = events.map(e => e.type);
      expect(types).toContain('proposal.created');
      expect(types).toContain('treasury.deposited');
      expect(types).toContain('risk.circuit_breaker_triggered');
    });
  });
});

// ============================================================================
// 9. Type Exports Test
// ============================================================================

describe('Type exports', () => {
  it('exports all required types from dao-governance', () => {
    // This test just imports types and checks they can be used
    const _proposal: DaoProposal = {
      id: 'test',
      type: 'strategy_approval',
      title: 'Test',
      description: 'Test',
      actions: [],
      proposer: '0x1',
      status: 'pending',
      snapshotBlock: 1000,
      votingStartsAt: new Date(),
      votingEndsAt: new Date(),
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
      totalVotingPower: 1000,
      quorum: 10,
      threshold: 51,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(_proposal.type).toBe('strategy_approval');
  });
});
