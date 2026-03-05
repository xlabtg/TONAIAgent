/**
 * TONAIAgent - GAAMP Module Tests
 *
 * Comprehensive test suite for the Global Autonomous Asset Management Protocol
 * covering all 6 protocol layers: Agent, Fund, Prime & Liquidity,
 * Clearing & Settlement, Governance, and Compliance & Identity.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGAAMPProtocol,
  createAgentLayer,
  createFundLayer,
  createPrimeLiquidityLayer,
  createClearingSettlementLayer,
  createGovernanceLayer,
  createComplianceIdentityLayer,
  DEFAULT_PROTOCOL_PARAMETERS,
  DEFAULT_BLOCKED_JURISDICTIONS,
  FUND_CLASS_KYC_REQUIREMENTS,
} from '../../src/gaamp/index';

// ============================================================================
// Agent Layer Tests
// ============================================================================

describe('AgentLayer', () => {
  let layer: ReturnType<typeof createAgentLayer>;

  beforeEach(() => {
    layer = createAgentLayer({ maxAgentsPerFund: 5 });
  });

  describe('configuration', () => {
    it('should initialize with default configuration', () => {
      const l = createAgentLayer();
      expect(l.config.maxAgentsPerFund).toBe(20);
      expect(l.config.agentRegistrationEnabled).toBe(true);
      expect(l.config.autoShutdownOnRiskBreach).toBe(true);
    });

    it('should accept custom configuration', () => {
      expect(layer.config.maxAgentsPerFund).toBe(5);
    });
  });

  describe('agent registration', () => {
    it('should register a new agent', () => {
      const agent = layer.registerAgent({ name: 'Test Agent', type: 'trading' });

      expect(agent.id).toBeDefined();
      expect(agent.name).toBe('Test Agent');
      expect(agent.type).toBe('trading');
      expect(agent.status).toBe('registered');
      expect(agent.capabilities).toContain('allocate');
      expect(agent.capabilities).toContain('trade');
    });

    it('should assign default capabilities by agent type', () => {
      const riskAgent = layer.registerAgent({ name: 'Risk Agent', type: 'risk' });
      expect(riskAgent.capabilities).toContain('hedge');
      expect(riskAgent.capabilities).toContain('monitor');
    });

    it('should accept custom capabilities', () => {
      const agent = layer.registerAgent({
        name: 'Custom Agent',
        type: 'trading',
        capabilities: ['allocate', 'report'],
      });
      expect(agent.capabilities).toEqual(['allocate', 'report']);
    });

    it('should enforce per-fund agent limit', () => {
      for (let i = 0; i < 5; i++) {
        layer.registerAgent({ name: `Agent ${i}`, type: 'trading', fundId: 'fund_x' });
      }
      expect(() =>
        layer.registerAgent({ name: 'Agent 6', type: 'trading', fundId: 'fund_x' })
      ).toThrow('maximum agent limit');
    });

    it('should reject registration when disabled', () => {
      const l = createAgentLayer({ agentRegistrationEnabled: false });
      expect(() => l.registerAgent({ name: 'X', type: 'trading' })).toThrow('disabled');
    });
  });

  describe('agent lifecycle', () => {
    it('should activate a registered agent', () => {
      const agent = layer.registerAgent({ name: 'A', type: 'trading' });
      const active = layer.activateAgent(agent.id);
      expect(active.status).toBe('active');
    });

    it('should pause an active agent', () => {
      const agent = layer.registerAgent({ name: 'A', type: 'trading' });
      layer.activateAgent(agent.id);
      const paused = layer.pauseAgent(agent.id);
      expect(paused.status).toBe('paused');
    });

    it('should shut down an agent', () => {
      const agent = layer.registerAgent({ name: 'A', type: 'trading' });
      const shutdown = layer.shutdownAgent(agent.id);
      expect(shutdown.status).toBe('shutdown');
    });

    it('should not activate a shut down agent', () => {
      const agent = layer.registerAgent({ name: 'A', type: 'trading' });
      layer.shutdownAgent(agent.id);
      expect(() => layer.activateAgent(agent.id)).toThrow('shut down');
    });
  });

  describe('standard interface execution', () => {
    let agentId: string;

    beforeEach(() => {
      const agent = layer.registerAgent({ name: 'Trading Bot', type: 'trading' });
      layer.activateAgent(agent.id);
      agentId = agent.id;
    });

    it('should execute allocate', () => {
      const result = layer.executeAllocate(agentId, {
        totalCapital: 1_000_000,
        targetAllocations: { TON: 0.5, USDT: 0.5 },
      });

      expect(result.success).toBe(true);
      expect(result.allocations['TON']).toBe(500_000);
      expect(result.allocations['USDT']).toBe(500_000);
    });

    it('should reject allocations that do not sum to 1', () => {
      expect(() =>
        layer.executeAllocate(agentId, {
          totalCapital: 1_000_000,
          targetAllocations: { TON: 0.4, USDT: 0.4 }, // sum = 0.8
        })
      ).toThrow('must sum to 1.0');
    });

    it('should execute rebalance and return trades', () => {
      const result = layer.executeRebalance(agentId, {
        currentAllocations: { TON: 0.4, USDT: 0.6 },
        targetAllocations: { TON: 0.6, USDT: 0.4 },
        threshold: 0.05,
      });

      expect(result.success).toBe(true);
      expect(result.trades.length).toBe(2);
    });

    it('should not produce trades when within threshold', () => {
      const result = layer.executeRebalance(agentId, {
        currentAllocations: { TON: 0.5, USDT: 0.5 },
        targetAllocations: { TON: 0.52, USDT: 0.48 },
        threshold: 0.05,
      });

      expect(result.trades.length).toBe(0);
    });

    it('should execute hedge', () => {
      const result = layer.executeHedge(agentId, {
        exposures: { TON: 100_000 },
        targetNetExposure: 0,
      });

      expect(result.success).toBe(true);
      expect(result.hedges.length).toBe(1);
      expect(result.netExposureAfter).toBe(0);
    });

    it('should generate report', () => {
      const report = layer.generateReport(agentId, { reportType: 'performance' });

      expect(report.agentId).toBe(agentId);
      expect(report.reportType).toBe('performance');
      expect(report.generatedAt).toBeDefined();
      expect(report.summary).toContain(agentId);
    });

    it('should fail for non-active agent', () => {
      const agent2 = layer.registerAgent({ name: 'B', type: 'trading' });
      expect(() =>
        layer.executeAllocate(agent2.id, {
          totalCapital: 100,
          targetAllocations: { TON: 1.0 },
        })
      ).toThrow('not active');
    });
  });

  describe('filtering', () => {
    beforeEach(() => {
      layer.registerAgent({ name: 'A', type: 'trading', fundId: 'fund_a' });
      layer.registerAgent({ name: 'B', type: 'risk', fundId: 'fund_a' });
      layer.registerAgent({ name: 'C', type: 'strategy', fundId: 'fund_b' });
    });

    it('should filter by type', () => {
      const agents = layer.listAgents({ type: 'risk' });
      expect(agents.length).toBe(1);
      expect(agents[0].name).toBe('B');
    });

    it('should filter by fund', () => {
      const agents = layer.listAgents({ fundId: 'fund_a' });
      expect(agents.length).toBe(2);
    });

    it('should filter by capability', () => {
      const agents = layer.listAgents({ hasCapability: 'hedge' });
      expect(agents.every(a => a.capabilities.includes('hedge'))).toBe(true);
    });
  });
});

// ============================================================================
// Fund Layer Tests
// ============================================================================

describe('FundLayer', () => {
  let layer: ReturnType<typeof createFundLayer>;

  beforeEach(() => {
    layer = createFundLayer();
  });

  describe('fund creation', () => {
    it('should create a fund', () => {
      const fund = layer.createFund({
        name: 'Test Fund',
        description: 'Test',
        type: 'hedge',
        fundClass: 'institutional',
        chain: 'ton',
        initialCapital: 1_000_000,
      });

      expect(fund.id).toBeDefined();
      expect(fund.name).toBe('Test Fund');
      expect(fund.aum).toBe(1_000_000);
      expect(fund.status).toBe('registered');
      expect(fund.navPerShare).toBe(100);
    });

    it('should calculate initial shares correctly', () => {
      const fund = layer.createFund({
        name: 'F',
        description: 'D',
        type: 'tokenized',
        fundClass: 'retail',
        chain: 'ton',
        initialCapital: 100_000,
      });

      // At 100 NAV/share: 100,000 / 100 = 1,000 shares
      expect(fund.totalShares).toBe(1_000);
    });

    it('should reject disabled fund types', () => {
      const l = createFundLayer({ allowedFundTypes: ['tokenized'] });
      expect(() =>
        l.createFund({
          name: 'F',
          description: 'D',
          type: 'hedge',
          fundClass: 'institutional',
          chain: 'ton',
        })
      ).toThrow('not permitted');
    });
  });

  describe('fund lifecycle', () => {
    let fundId: string;

    beforeEach(() => {
      const fund = layer.createFund({
        name: 'LC Fund',
        description: 'Test',
        type: 'hedge',
        fundClass: 'institutional',
        chain: 'ton',
      });
      fundId = fund.id;
    });

    it('should suspend and reactivate a fund', () => {
      const suspended = layer.suspendFund(fundId);
      expect(suspended.status).toBe('suspended');

      const active = layer.reactivateFund(fundId);
      expect(active.status).toBe('active');
    });

    it('should close a fund', () => {
      const closed = layer.closeFund(fundId);
      expect(closed.status).toBe('closed');
    });

    it('should not close an already closed fund', () => {
      layer.closeFund(fundId);
      expect(() => layer.closeFund(fundId)).toThrow('already closed');
    });
  });

  describe('NAV management', () => {
    it('should update NAV and recalculate per-share NAV', () => {
      const fund = layer.createFund({
        name: 'F',
        description: 'D',
        type: 'hedge',
        fundClass: 'institutional',
        chain: 'ton',
        initialCapital: 1_000_000,
      });

      const updated = layer.updateNAV(fund.id, 1_100_000);
      expect(updated.nav).toBe(1_100_000);
      expect(updated.navPerShare).toBeGreaterThan(fund.navPerShare);
    });
  });

  describe('investments and redemptions', () => {
    let fundId: string;

    beforeEach(() => {
      const fund = layer.createFund({
        name: 'Invest Fund',
        description: 'D',
        type: 'hedge',
        fundClass: 'retail',
        chain: 'ton',
        initialCapital: 100_000,
      });
      fundId = fund.id;
    });

    it('should process an investment', () => {
      const investment = layer.processInvestment({
        fundId,
        participantId: 'participant_1',
        amount: 10_000,
      });

      expect(investment.status).toBe('confirmed');
      expect(investment.sharesIssued).toBeGreaterThan(0);

      const fund = layer.getFund(fundId)!;
      expect(fund.aum).toBe(110_000);
    });

    it('should process a redemption', () => {
      const investment = layer.processInvestment({
        fundId,
        participantId: 'participant_1',
        amount: 10_000,
      });

      const redemption = layer.processRedemption({
        fundId,
        participantId: 'participant_1',
        sharesToRedeem: investment.sharesIssued,
      });

      expect(redemption.status).toBe('pending');
      expect(redemption.sharesRedeemed).toBe(investment.sharesIssued);
    });

    it('should confirm a redemption and update fund AUM', () => {
      const investment = layer.processInvestment({
        fundId,
        participantId: 'p1',
        amount: 10_000,
      });
      const redemption = layer.processRedemption({
        fundId,
        participantId: 'p1',
        sharesToRedeem: investment.sharesIssued,
      });
      const confirmed = layer.confirmRedemption(redemption.id);

      expect(confirmed.status).toBe('settled');
      const fund = layer.getFund(fundId)!;
      expect(fund.aum).toBeCloseTo(100_000, 0);
    });
  });
});

// ============================================================================
// Prime & Liquidity Layer Tests
// ============================================================================

describe('PrimeLiquidityLayer', () => {
  let layer: ReturnType<typeof createPrimeLiquidityLayer>;

  beforeEach(() => {
    layer = createPrimeLiquidityLayer();
  });

  describe('pool management', () => {
    it('should register a pool', () => {
      const pool = layer.registerPool({
        name: 'TON/USDT Pool',
        type: 'automated_market_maker',
        assets: ['TON', 'USDT'],
        totalLiquidity: 1_000_000,
        chain: 'ton',
        apy: 0.08,
      });

      expect(pool.id).toBeDefined();
      expect(pool.availableLiquidity).toBe(1_000_000);
      expect(pool.utilizationRate).toBe(0);
    });

    it('should update pool liquidity', () => {
      const pool = layer.registerPool({
        name: 'Pool',
        type: 'orderbook',
        assets: ['TON'],
        totalLiquidity: 500_000,
        chain: 'ton',
      });

      const updated = layer.updatePoolLiquidity(pool.id, -100_000);
      expect(updated.availableLiquidity).toBe(400_000);
      expect(updated.utilizationRate).toBeGreaterThan(0);
    });

    it('should reject negative available liquidity', () => {
      const pool = layer.registerPool({
        name: 'Pool',
        type: 'orderbook',
        assets: ['TON'],
        totalLiquidity: 100_000,
        chain: 'ton',
      });

      expect(() => layer.updatePoolLiquidity(pool.id, -200_000)).toThrow('Insufficient');
    });
  });

  describe('smart routing', () => {
    beforeEach(() => {
      layer.registerPool({
        name: 'TON Pool',
        type: 'automated_market_maker',
        assets: ['TON', 'USDT'],
        totalLiquidity: 10_000_000,
        chain: 'ton',
      });
    });

    it('should find a route for a single-chain swap', () => {
      const route = layer.findBestRoute({
        fromAsset: 'TON',
        toAsset: 'USDT',
        fromChain: 'ton',
        toChain: 'ton',
        amount: 10_000,
      });

      expect(route).not.toBeNull();
      expect(route!.hops.length).toBeGreaterThan(0);
      expect(route!.fees).toBeGreaterThan(0);
    });

    it('should return null when no pools available', () => {
      const emptyLayer = createPrimeLiquidityLayer();
      const route = emptyLayer.findBestRoute({
        fromAsset: 'TON',
        toAsset: 'ETH',
        fromChain: 'ton',
        toChain: 'ethereum',
        amount: 1_000,
      });
      expect(route).toBeNull();
    });
  });

  describe('internal netting', () => {
    it('should net opposing positions and free capital', () => {
      const positions = [
        { fundId: 'fund_a', asset: 'TON', chain: 'ton', amount: 100_000, side: 'long' as const },
        { fundId: 'fund_b', asset: 'TON', chain: 'ton', amount: 100_000, side: 'short' as const },
      ];

      const result = layer.runInternalNetting(positions);

      expect(result.capitalFreed).toBeGreaterThan(0);
      expect(result.tradesEliminated).toBeGreaterThan(0);
    });

    it('should return zero netting when disabled', () => {
      const l = createPrimeLiquidityLayer({ enableInternalNetting: false });
      const positions = [
        { fundId: 'f', asset: 'TON', chain: 'ton', amount: 100, side: 'long' as const },
      ];
      const result = l.runInternalNetting(positions);
      expect(result.capitalFreed).toBe(0);
    });
  });

  describe('system liquidity', () => {
    it('should aggregate liquidity across pools', () => {
      layer.registerPool({
        name: 'Pool A', type: 'automated_market_maker', assets: ['TON'],
        totalLiquidity: 500_000, chain: 'ton',
      });
      layer.registerPool({
        name: 'Pool B', type: 'automated_market_maker', assets: ['USDT'],
        totalLiquidity: 300_000, chain: 'ethereum',
      });

      const metrics = layer.getSystemLiquidity();
      expect(metrics.totalLiquidity).toBe(800_000);
      expect(metrics.poolCount).toBe(2);
    });
  });
});

// ============================================================================
// Clearing & Settlement Layer Tests
// ============================================================================

describe('ClearingSettlementLayer', () => {
  let layer: ReturnType<typeof createClearingSettlementLayer>;

  beforeEach(() => {
    layer = createClearingSettlementLayer({
      enableAINetting: true,
      settlementFinality: 'deterministic',
      insurancePoolEnabled: true,
    });
  });

  describe('trade clearing', () => {
    it('should submit a trade for clearing', () => {
      const record = layer.submitTrade({
        tradeId: 'trade_001',
        buyerFundId: 'fund_a',
        sellerFundId: 'fund_b',
        asset: 'TON',
        quantity: 10_000,
        price: 5.5,
        chain: 'ton',
      });

      expect(record.id).toBeDefined();
      expect(record.status).toBe('pending');
      expect(record.notionalValue).toBe(55_000);
      expect(record.marginRequired).toBe(5_500); // 10%
    });

    it('should update clearing status', () => {
      const record = layer.submitTrade({
        tradeId: 'trade_002',
        buyerFundId: 'fund_a',
        sellerFundId: 'fund_b',
        asset: 'USDT',
        quantity: 1_000,
        price: 1.0,
        chain: 'ton',
      });

      const updated = layer.updateClearingStatus(record.id, 'matched');
      expect(updated.status).toBe('matched');
      expect(updated.matchedAt).toBeDefined();
    });
  });

  describe('netting engine', () => {
    it('should run netting and reduce obligations', () => {
      layer.submitTrade({
        tradeId: 'trade_001', buyerFundId: 'fund_a', sellerFundId: 'fund_b',
        asset: 'TON', quantity: 100, price: 5.5, chain: 'ton',
      });
      layer.submitTrade({
        tradeId: 'trade_002', buyerFundId: 'fund_b', sellerFundId: 'fund_a',
        asset: 'TON', quantity: 100, price: 5.5, chain: 'ton',
      });

      const result = layer.runNettingEngine(['fund_a', 'fund_b']);
      expect(result.grossObligations).toBe(2);
    });

    it('should return all obligations when netting disabled', () => {
      const l = createClearingSettlementLayer({ enableAINetting: false });
      l.submitTrade({
        tradeId: 'trade_x', buyerFundId: 'fa', sellerFundId: 'fb',
        asset: 'TON', quantity: 10, price: 5, chain: 'ton',
      });
      const result = l.runNettingEngine(['fa', 'fb']);
      expect(result.efficiencyRate).toBe(0);
    });
  });

  describe('margin calls', () => {
    it('should issue a margin call', () => {
      const call = layer.issueMarginCall({
        fundId: 'fund_a',
        marginType: 'initial',
        requiredMargin: 100_000,
        postedMargin: 60_000,
      });

      expect(call.status).toBe('issued');
      expect(call.deficit).toBe(40_000);
    });

    it('should meet a margin call', () => {
      const call = layer.issueMarginCall({
        fundId: 'fund_a',
        marginType: 'variation',
        requiredMargin: 50_000,
        postedMargin: 30_000,
      });

      const met = layer.meetMarginCall(call.id, 20_000);
      expect(met.status).toBe('met');
      expect(met.deficit).toBe(0);
    });
  });

  describe('settlement', () => {
    it('should initiate and confirm settlement', () => {
      const record = layer.submitTrade({
        tradeId: 'trade_settle', buyerFundId: 'fund_a', sellerFundId: 'fund_b',
        asset: 'TON', quantity: 100, price: 5.5, chain: 'ton',
      });

      layer.updateClearingStatus(record.id, 'approved');
      const settlement = layer.initiateSettlement(record.id);
      expect(settlement.status).toBe('pending');

      const confirmed = layer.confirmSettlement(settlement.id, 'tx_abc123');
      expect(confirmed.status).toBe('confirmed');
      expect(confirmed.transactionHash).toBe('tx_abc123');
    });
  });

  describe('default resolution', () => {
    it('should resolve a default using insurance pool', () => {
      layer.fundInsurancePool(1_000_000, 'fund_a');
      const result = layer.resolveDefault({
        defaultingFundId: 'fund_b',
        exposureAmount: 100_000,
      });

      expect(result.exposureAmount).toBe(100_000);
      expect(result.insuranceCoverage).toBeGreaterThan(0);
    });
  });

  describe('insurance pool', () => {
    it('should fund and report insurance pool', () => {
      layer.fundInsurancePool(500_000, 'fund_a');
      const pool = layer.getInsurancePool();
      expect(pool.availableReserves).toBe(500_000);
      expect(pool.fundedBy).toContain('fund_a');
    });

    it('should pay claims from insurance pool', () => {
      layer.fundInsurancePool(500_000, 'fund_a');
      const covered = layer.claimInsurance(100_000, 'smart contract exploit');
      expect(covered).toBe(100_000);

      const pool = layer.getInsurancePool();
      expect(pool.availableReserves).toBe(400_000);
    });
  });
});

// ============================================================================
// Governance Layer Tests
// ============================================================================

describe('GovernanceLayer', () => {
  let layer: ReturnType<typeof createGovernanceLayer>;

  beforeEach(() => {
    layer = createGovernanceLayer({
      votingPeriodDays: 7,
      quorumPercent: 10,
      approvalThresholdPercent: 51,
    });
    layer.setVotingPower('participant_a', 700);
    layer.setVotingPower('participant_b', 300);
  });

  describe('default parameters', () => {
    it('should have default protocol parameters', () => {
      const params = layer.getParameters();
      expect(params.maxAgentsPerFund).toBe(DEFAULT_PROTOCOL_PARAMETERS.maxAgentsPerFund);
      expect(params.minMarginRatio).toBe(DEFAULT_PROTOCOL_PARAMETERS.minMarginRatio);
    });
  });

  describe('voting power', () => {
    it('should set and retrieve voting power', () => {
      expect(layer.getVotingPower('participant_a')).toBe(700);
    });

    it('should return 0 for unknown participant', () => {
      expect(layer.getVotingPower('unknown')).toBe(0);
    });

    it('should sum total voting power', () => {
      expect(layer.getTotalVotingPower()).toBe(1000);
    });
  });

  describe('proposals', () => {
    it('should submit a proposal', () => {
      const proposal = layer.submitProposal({
        title: 'Reduce fees',
        description: 'Lower protocol fees',
        type: 'fee_structure_change',
        proposerId: 'participant_a',
        parameters: { protocolFeePercent: 0.05 },
      });

      expect(proposal.id).toBeDefined();
      expect(proposal.status).toBe('voting');
      expect(proposal.yesVotes).toBe(0);
    });

    it('should reject proposal from participant with no voting power', () => {
      expect(() =>
        layer.submitProposal({
          title: 'X',
          description: 'Y',
          type: 'parameter_change',
          proposerId: 'unknown',
          parameters: {},
        })
      ).toThrow('no voting power');
    });
  });

  describe('voting', () => {
    let proposalId: string;

    beforeEach(() => {
      const proposal = layer.submitProposal({
        title: 'Test Proposal',
        description: 'Test',
        type: 'parameter_change',
        proposerId: 'participant_a',
        parameters: { maxAgentsPerFund: 30 },
      });
      proposalId = proposal.id;
    });

    it('should cast a vote', () => {
      const vote = layer.castVote({
        proposalId,
        voterId: 'participant_a',
        decision: 'yes',
      });

      expect(vote.decision).toBe('yes');
      expect(vote.votingPower).toBe(700);

      const proposal = layer.getProposal(proposalId)!;
      expect(proposal.yesVotes).toBe(700);
    });

    it('should reject duplicate votes', () => {
      layer.castVote({ proposalId, voterId: 'participant_a', decision: 'yes' });
      expect(() =>
        layer.castVote({ proposalId, voterId: 'participant_a', decision: 'no' })
      ).toThrow('already voted');
    });
  });

  describe('proposal lifecycle', () => {
    it('should pass when quorum and threshold are met', () => {
      const proposal = layer.submitProposal({
        title: 'Proposal',
        description: 'D',
        type: 'parameter_change',
        proposerId: 'participant_a',
        parameters: { maxAgentsPerFund: 25 },
      });

      layer.castVote({ proposalId: proposal.id, voterId: 'participant_a', decision: 'yes' });
      layer.castVote({ proposalId: proposal.id, voterId: 'participant_b', decision: 'yes' });

      const finalized = layer.finalizeProposal(proposal.id);
      expect(finalized.status).toBe('passed');
    });

    it('should reject when approval threshold is not met', () => {
      const proposal = layer.submitProposal({
        title: 'Proposal',
        description: 'D',
        type: 'parameter_change',
        proposerId: 'participant_a',
        parameters: { maxAgentsPerFund: 25 },
      });

      layer.castVote({ proposalId: proposal.id, voterId: 'participant_a', decision: 'no' });
      layer.castVote({ proposalId: proposal.id, voterId: 'participant_b', decision: 'yes' });

      const finalized = layer.finalizeProposal(proposal.id);
      expect(finalized.status).toBe('rejected');
    });

    it('should execute a passed proposal and update parameters', () => {
      const proposal = layer.submitProposal({
        title: 'Max agents update',
        description: 'Increase max agents',
        type: 'parameter_change',
        proposerId: 'participant_a',
        parameters: { maxAgentsPerFund: 50 },
      });

      layer.castVote({ proposalId: proposal.id, voterId: 'participant_a', decision: 'yes' });
      layer.castVote({ proposalId: proposal.id, voterId: 'participant_b', decision: 'yes' });
      layer.finalizeProposal(proposal.id);
      const executed = layer.executeProposal(proposal.id);

      expect(executed.status).toBe('executed');
      expect(layer.getParameters().maxAgentsPerFund).toBe(50);
    });
  });

  describe('emergency actions', () => {
    it('should pause and unpause the protocol', () => {
      expect(layer.isPaused()).toBe(false);
      layer.emergencyPause('security incident');
      expect(layer.isPaused()).toBe(true);
      layer.emergencyUnpause();
      expect(layer.isPaused()).toBe(false);
    });
  });
});

// ============================================================================
// Compliance & Identity Layer Tests
// ============================================================================

describe('ComplianceIdentityLayer', () => {
  let layer: ReturnType<typeof createComplianceIdentityLayer>;

  beforeEach(() => {
    layer = createComplianceIdentityLayer({
      kycRequired: true,
      amlScreeningEnabled: true,
      auditTrailEnabled: true,
    });
  });

  describe('participant registration', () => {
    it('should register a participant', () => {
      const participant = layer.registerParticipant({
        name: 'Acme Fund',
        type: 'institution',
        institutionalType: 'hedge_fund',
        primaryJurisdiction: 'US',
      });

      expect(participant.id).toBeDefined();
      expect(participant.name).toBe('Acme Fund');
      expect(participant.jurisdiction.primaryJurisdiction).toBe('US');
      expect(participant.kyc.status).toBe('pending');
    });

    it('should block registration from blocked jurisdictions', () => {
      const blockedJurisdiction = DEFAULT_BLOCKED_JURISDICTIONS[0];
      expect(() =>
        layer.registerParticipant({
          name: 'X',
          type: 'individual',
          primaryJurisdiction: blockedJurisdiction,
        })
      ).toThrow('blocked');
    });

    it('should restrict permissions for restricted jurisdiction', () => {
      const participant = layer.registerParticipant({
        name: 'Restricted',
        type: 'institution',
        primaryJurisdiction: 'RU',
      });

      expect(participant.permissions.canCreateFund).toBe(false);
      expect(participant.permissions.crossChainEnabled).toBe(false);
    });
  });

  describe('KYC management', () => {
    let participantId: string;

    beforeEach(() => {
      const p = layer.registerParticipant({
        name: 'Test',
        type: 'institution',
        primaryJurisdiction: 'SG',
      });
      participantId = p.id;
    });

    it('should approve KYC', () => {
      const updated = layer.approveKYC(participantId, 'enhanced');
      expect(updated.kyc.status).toBe('approved');
      expect(updated.kyc.level).toBe('enhanced');
      expect(updated.kyc.expiresAt).toBeDefined();
    });

    it('should reject KYC', () => {
      const updated = layer.rejectKYC(participantId, 'suspicious documents');
      expect(updated.kyc.status).toBe('rejected');
    });

    it('should validate KYC status', () => {
      expect(layer.isKYCValid(participantId)).toBe(false);
      layer.approveKYC(participantId, 'basic');
      expect(layer.isKYCValid(participantId)).toBe(true);
    });
  });

  describe('AML management', () => {
    let participantId: string;

    beforeEach(() => {
      const p = layer.registerParticipant({
        name: 'AML Test',
        type: 'institution',
        primaryJurisdiction: 'US',
      });
      participantId = p.id;
    });

    it('should screen a participant', () => {
      const aml = layer.screenParticipant(participantId);
      expect(aml.screenedAt).toBeDefined();
      expect(aml.nextScreeningAt).toBeDefined();
    });

    it('should mark participant as AML clean', () => {
      expect(layer.isAMLClean(participantId)).toBe(true);
    });

    it('should flag participant with sanctions', () => {
      layer.updateAMLRecord(participantId, { sanctions: true });
      expect(layer.isAMLClean(participantId)).toBe(false);
    });
  });

  describe('access control', () => {
    it('should grant fund class access after KYC', () => {
      const p = layer.registerParticipant({
        name: 'Inst',
        type: 'institution',
        primaryJurisdiction: 'US',
      });

      expect(layer.canAccessFundClass(p.id, 'institutional')).toBe(false);

      layer.approveKYC(p.id, 'institutional');
      expect(layer.canAccessFundClass(p.id, 'institutional')).toBe(true);
    });

    it('should block access for sanctioned participants', () => {
      const p = layer.registerParticipant({
        name: 'Sanctioned',
        type: 'individual',
        primaryJurisdiction: 'US',
      });
      layer.approveKYC(p.id, 'institutional');
      layer.updateAMLRecord(p.id, { sanctions: true });

      expect(layer.canAccessFundClass(p.id, 'retail')).toBe(false);
    });

    it('should check jurisdiction access', () => {
      expect(layer.isJurisdictionAllowed('US')).toBe(true);
      expect(layer.isJurisdictionAllowed(DEFAULT_BLOCKED_JURISDICTIONS[0])).toBe(false);
    });
  });

  describe('audit trail', () => {
    it('should record and retrieve audit entries', () => {
      const p = layer.registerParticipant({
        name: 'Audit Test',
        type: 'individual',
        primaryJurisdiction: 'DE',
      });

      const trail = layer.getAuditTrail({ participantId: p.id });
      expect(trail.length).toBeGreaterThan(0);
      expect(trail[0].action).toBe('participant_registered');
    });
  });

  describe('compliance reports', () => {
    it('should generate a compliance report', () => {
      const p = layer.registerParticipant({
        name: 'Report Test',
        type: 'institution',
        primaryJurisdiction: 'GB',
      });
      layer.approveKYC(p.id, 'enhanced');

      const report = layer.generateComplianceReport({
        participantId: p.id,
        jurisdiction: 'GB',
        period: { from: new Date('2026-01-01'), to: new Date('2026-03-31') },
        reportType: 'regulatory',
      });

      expect(report.id).toBeDefined();
      expect(report.findings.length).toBeGreaterThan(0);
      expect(report.status).toBe('draft');
    });
  });

  describe('FUND_CLASS_KYC_REQUIREMENTS', () => {
    it('should have correct KYC requirements per fund class', () => {
      expect(FUND_CLASS_KYC_REQUIREMENTS['retail']).toBe('basic');
      expect(FUND_CLASS_KYC_REQUIREMENTS['institutional']).toBe('enhanced');
    });
  });
});

// ============================================================================
// Unified GAAMP Protocol Tests
// ============================================================================

describe('GAAMPProtocol (Unified)', () => {
  let protocol: ReturnType<typeof createGAAMPProtocol>;

  beforeEach(() => {
    protocol = createGAAMPProtocol({
      chainId: 'ton',
      protocolParameters: { maxAgentsPerFund: 5 },
    });
  });

  it('should initialize all layers', () => {
    expect(protocol.agentLayer).toBeDefined();
    expect(protocol.fundLayer).toBeDefined();
    expect(protocol.liquidityLayer).toBeDefined();
    expect(protocol.clearingLayer).toBeDefined();
    expect(protocol.governanceLayer).toBeDefined();
    expect(protocol.compliance).toBeDefined();
  });

  it('should report correct version', () => {
    expect(protocol.version).toBe('1.0.0');
  });

  it('should return system status', () => {
    const status = protocol.getSystemStatus();
    expect(status.version).toBe('1.0.0');
    expect(status.chain).toBe('ton');
    expect(status.isPaused).toBe(false);
    expect(status.generatedAt).toBeDefined();
  });

  it('should execute a full trade lifecycle demo', () => {
    // 1. Register participant
    const participant = protocol.compliance.registerParticipant({
      name: 'Alpha Capital',
      type: 'institution',
      institutionalType: 'hedge_fund',
      primaryJurisdiction: 'US',
    });
    protocol.compliance.approveKYC(participant.id, 'institutional');

    // 2. Create fund
    const fund = protocol.fundLayer.createFund({
      name: 'TON Alpha Fund',
      description: 'AI multi-strategy',
      type: 'hedge',
      fundClass: 'institutional',
      chain: 'ton',
      initialCapital: 5_000_000,
    });

    // 3. Deploy agent
    const agent = protocol.agentLayer.registerAgent({
      name: 'Alpha Trader',
      type: 'trading',
      fundId: fund.id,
    });
    protocol.agentLayer.activateAgent(agent.id);

    // 4. Allocate capital
    const allocation = protocol.agentLayer.executeAllocate(agent.id, {
      totalCapital: 5_000_000,
      targetAllocations: { TON: 0.5, USDT: 0.5 },
    });
    expect(allocation.success).toBe(true);

    // 5. Submit trade
    const clearing = protocol.clearingLayer.submitTrade({
      tradeId: 'trade_demo_001',
      buyerFundId: fund.id,
      sellerFundId: 'counterparty',
      asset: 'TON',
      quantity: 10_000,
      price: 5.5,
      chain: 'ton',
    });
    expect(clearing.status).toBe('pending');

    // 6. Settle trade
    protocol.clearingLayer.updateClearingStatus(clearing.id, 'approved');
    const settlement = protocol.clearingLayer.initiateSettlement(clearing.id);
    protocol.clearingLayer.confirmSettlement(settlement.id, 'tx_demo_hash');
    expect(settlement.status).toBe('pending'); // confirmed async

    // 7. System status shows activity
    const status = protocol.getSystemStatus();
    expect(status.agents).toBe(1);
    expect(status.registeredParticipants).toBe(1);
  });

  it('should forward events from all layers', () => {
    const events: string[] = [];
    protocol.onEvent((event) => events.push(event.type));

    protocol.compliance.registerParticipant({
      name: 'P',
      type: 'individual',
      primaryJurisdiction: 'DE',
    });

    protocol.fundLayer.createFund({
      name: 'F',
      description: 'D',
      type: 'tokenized',
      fundClass: 'retail',
      chain: 'ton',
    });

    expect(events).toContain('participant_registered');
    expect(events).toContain('fund_created');
  });
});
