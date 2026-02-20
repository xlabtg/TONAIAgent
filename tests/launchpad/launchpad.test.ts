/**
 * TONAIAgent - Agent Launchpad Tests
 *
 * Comprehensive test suite for the Agent Launchpad module.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createLaunchpadService,
  createTreasuryAgentManager,
  createGovernanceManager,
  createFundManager,
  createCapitalPoolManager,
  createOrganizationManager,
  createMonitoringManager,
  DEFAULT_ROLE_PERMISSIONS,
  LaunchpadEvent,
} from '../../src/launchpad';

// ============================================================================
// Launchpad Service Tests
// ============================================================================

describe('LaunchpadService', () => {
  it('should create a launchpad service with all components', () => {
    const launchpad = createLaunchpadService();

    expect(launchpad.agents).toBeDefined();
    expect(launchpad.governance).toBeDefined();
    expect(launchpad.funds).toBeDefined();
    expect(launchpad.pools).toBeDefined();
    expect(launchpad.organizations).toBeDefined();
    expect(launchpad.monitoring).toBeDefined();
  });

  it('should report healthy status', async () => {
    const launchpad = createLaunchpadService();
    const health = await launchpad.getHealth();

    expect(health.overall).toBe('healthy');
    expect(health.components.agents).toBe(true);
    expect(health.components.governance).toBe(true);
    expect(health.components.funds).toBe(true);
    expect(health.components.pools).toBe(true);
    expect(health.components.organizations).toBe(true);
    expect(health.components.monitoring).toBe(true);
  });

  it('should forward events from all components', async () => {
    const launchpad = createLaunchpadService();
    const events: LaunchpadEvent[] = [];

    launchpad.onEvent((event) => {
      events.push(event);
    });

    // Create organization triggers event
    await launchpad.organizations.createOrganization({
      name: 'Test DAO',
      description: 'Test description',
      type: 'dao',
      creatorUserId: 'user_123',
    });

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBe('organization_created');
  });
});

// ============================================================================
// Organization Manager Tests
// ============================================================================

describe('OrganizationManager', () => {
  let manager: ReturnType<typeof createOrganizationManager>;

  beforeEach(() => {
    manager = createOrganizationManager();
  });

  it('should create an organization', async () => {
    const org = await manager.createOrganization({
      name: 'Acme DAO',
      description: 'A test DAO',
      type: 'dao',
      creatorUserId: 'user_123',
    });

    expect(org.id).toBeDefined();
    expect(org.name).toBe('Acme DAO');
    expect(org.type).toBe('dao');
    expect(org.status).toBe('pending_setup');
    expect(org.members.length).toBe(1);
    expect(org.members[0].role).toBe('owner');
  });

  it('should get an organization by id', async () => {
    const org = await manager.createOrganization({
      name: 'Test Org',
      description: 'Test',
      type: 'crypto_fund',
      creatorUserId: 'user_1',
    });

    const found = manager.getOrganization(org.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Test Org');
  });

  it('should add members to an organization', async () => {
    const org = await manager.createOrganization({
      name: 'Test',
      description: 'Test',
      type: 'dao',
      creatorUserId: 'user_1',
    });

    const member = await manager.addMember({
      organizationId: org.id,
      userId: 'user_2',
      email: 'user2@test.com',
      name: 'User Two',
      role: 'treasury_manager',
      invitedBy: 'user_1',
    });

    expect(member.id).toBeDefined();
    expect(member.role).toBe('treasury_manager');
    expect(member.permissions.canManageTreasury).toBe(true);
  });

  it('should not allow removing the owner', async () => {
    const org = await manager.createOrganization({
      name: 'Test',
      description: 'Test',
      type: 'dao',
      creatorUserId: 'user_1',
    });

    const owner = org.members[0];
    await expect(manager.removeMember(org.id, owner.id, 'test')).rejects.toThrow('Cannot remove the owner');
  });

  it('should update governance config', async () => {
    const org = await manager.createOrganization({
      name: 'Test',
      description: 'Test',
      type: 'dao',
      creatorUserId: 'user_1',
    });

    const updated = await manager.updateGovernanceConfig(org.id, {
      votingPeriodHours: 48,
      quorumPercent: 20,
    });

    expect(updated.governanceConfig.votingPeriodHours).toBe(48);
    expect(updated.governanceConfig.quorumPercent).toBe(20);
  });

  it('should provide default role permissions', () => {
    const adminPerms = manager.getPermissionsForRole('admin');
    expect(adminPerms.canManageAgents).toBe(true);
    expect(adminPerms.canManageMembers).toBe(true);

    const viewerPerms = manager.getPermissionsForRole('viewer');
    expect(viewerPerms.canManageAgents).toBe(false);
    expect(viewerPerms.canVote).toBe(false);
    expect(viewerPerms.canViewReports).toBe(true);
  });
});

// ============================================================================
// Treasury Agent Manager Tests
// ============================================================================

describe('TreasuryAgentManager', () => {
  let manager: ReturnType<typeof createTreasuryAgentManager>;

  beforeEach(() => {
    manager = createTreasuryAgentManager();
  });

  it('should create a treasury agent', async () => {
    const agent = await manager.createAgent({
      organizationId: 'org_123',
      name: 'Yield Optimizer',
      description: 'Optimizes yield across DeFi protocols',
      type: 'yield',
      config: { capitalAllocated: 10000 },
      strategy: { type: 'yield_optimization', yieldTargetApy: 15 },
    });

    expect(agent.id).toBeDefined();
    expect(agent.name).toBe('Yield Optimizer');
    expect(agent.type).toBe('yield');
    expect(agent.status).toBe('draft');
  });

  it('should deploy an agent', async () => {
    const agent = await manager.createAgent({
      organizationId: 'org_123',
      name: 'Test Agent',
      description: 'Test',
      type: 'treasury',
      config: {},
      strategy: {},
    });

    const result = await manager.deployAgent(agent.id);

    expect(result.success).toBe(true);
    expect(result.walletAddress).toBeDefined();

    const deployed = manager.getAgent(agent.id);
    expect(deployed?.status).toBe('active');
  });

  it('should pause and resume an agent', async () => {
    const agent = await manager.createAgent({
      organizationId: 'org_123',
      name: 'Test',
      description: 'Test',
      type: 'treasury',
      config: {},
      strategy: {},
    });

    await manager.deployAgent(agent.id);
    await manager.pauseAgent(agent.id, 'Testing');

    expect(manager.getAgent(agent.id)?.status).toBe('paused');

    await manager.startAgent(agent.id);
    expect(manager.getAgent(agent.id)?.status).toBe('active');
  });

  it('should execute rebalance', async () => {
    const agent = await manager.createAgent({
      organizationId: 'org_123',
      name: 'Test',
      description: 'Test',
      type: 'treasury',
      config: {},
      strategy: { type: 'balanced' },
    });

    await manager.deployAgent(agent.id);
    const result = await manager.executeRebalance(agent.id);

    expect(result.success).toBe(true);
    expect(result.executedAt).toBeDefined();
  });

  it('should check risk limits', async () => {
    const agent = await manager.createAgent({
      organizationId: 'org_123',
      name: 'Test',
      description: 'Test',
      type: 'treasury',
      config: {},
      strategy: {},
      riskControls: { maxDrawdown: 10, concentrationLimit: 25 },
    });

    const result = await manager.checkRiskLimits(agent.id);

    expect(result.passed).toBe(true);
    expect(result.metrics).toBeDefined();
  });

  it('should simulate strategy', async () => {
    const agent = await manager.createAgent({
      organizationId: 'org_123',
      name: 'Test',
      description: 'Test',
      type: 'yield',
      config: {},
      strategy: { type: 'yield_optimization' },
    });

    const result = await manager.simulateStrategy(agent.id, {
      days: 30,
      initialCapital: 10000,
      marketScenario: 'bullish',
    });

    expect(result.success).toBe(true);
    expect(result.finalValue).toBeGreaterThan(0);
    expect(result.sharpeRatio).toBeDefined();
  });

  it('should trigger emergency stop', async () => {
    const agent = await manager.createAgent({
      organizationId: 'org_123',
      name: 'Test',
      description: 'Test',
      type: 'treasury',
      config: {},
      strategy: {},
    });

    await manager.deployAgent(agent.id);
    await manager.triggerEmergencyStop(agent.id, 'Critical risk detected');

    expect(manager.getAgent(agent.id)?.status).toBe('stopped');
  });

  it('should get audit trail', async () => {
    const agent = await manager.createAgent({
      organizationId: 'org_123',
      name: 'Test',
      description: 'Test',
      type: 'treasury',
      config: {},
      strategy: {},
    });

    await manager.deployAgent(agent.id);
    const auditTrail = manager.getAuditTrail(agent.id);

    expect(auditTrail.length).toBeGreaterThan(0);
    expect(auditTrail.some((e) => e.action === 'create')).toBe(true);
    expect(auditTrail.some((e) => e.action === 'deploy')).toBe(true);
  });
});

// ============================================================================
// Governance Manager Tests
// ============================================================================

describe('GovernanceManager', () => {
  let manager: ReturnType<typeof createGovernanceManager>;

  beforeEach(() => {
    manager = createGovernanceManager();
    // Configure governance and set voting power
    manager.configureGovernance('org_123', {
      type: 'token_voting',
      quorumPercent: 10,
      approvalThresholdPercent: 50,
    });
    manager.setMemberVotingPower('org_123', 'user_1', 100);
    manager.setMemberVotingPower('org_123', 'user_2', 50);
    manager.setMemberVotingPower('org_123', 'user_3', 50);
  });

  it('should create a proposal', async () => {
    const proposal = await manager.createProposal({
      organizationId: 'org_123',
      type: 'strategy_change',
      title: 'Update yield target',
      description: 'Increase yield target to 20% APY',
      proposer: 'user_1',
      actions: [
        { type: 'parameter_change', target: 'yield_target', parameters: { value: 20 } },
      ],
    });

    expect(proposal.id).toBeDefined();
    expect(proposal.status).toBe('active');
    expect(proposal.type).toBe('strategy_change');
  });

  it('should cast votes', async () => {
    const proposal = await manager.createProposal({
      organizationId: 'org_123',
      type: 'allocation_change',
      title: 'Test Proposal',
      description: 'Test',
      proposer: 'user_1',
      actions: [],
    });

    const vote = await manager.castVote({
      proposalId: proposal.id,
      voter: 'user_2',
      support: 'for',
    });

    expect(vote.id).toBeDefined();
    expect(vote.votingPower).toBe(50);

    const votes = manager.getVotes(proposal.id);
    expect(votes.length).toBe(1);
  });

  it('should not allow double voting', async () => {
    const proposal = await manager.createProposal({
      organizationId: 'org_123',
      type: 'strategy_change',
      title: 'Test',
      description: 'Test',
      proposer: 'user_1',
      actions: [],
    });

    await manager.castVote({
      proposalId: proposal.id,
      voter: 'user_2',
      support: 'for',
    });

    await expect(
      manager.castVote({
        proposalId: proposal.id,
        voter: 'user_2',
        support: 'against',
      })
    ).rejects.toThrow('Already voted');
  });

  it('should check quorum', async () => {
    const proposal = await manager.createProposal({
      organizationId: 'org_123',
      type: 'strategy_change',
      title: 'Test',
      description: 'Test',
      proposer: 'user_1',
      actions: [],
    });

    // Before voting
    let quorum = manager.checkQuorum(proposal.id);
    expect(quorum.reached).toBe(false);

    // After voting
    await manager.castVote({
      proposalId: proposal.id,
      voter: 'user_1',
      support: 'for',
    });

    quorum = manager.checkQuorum(proposal.id);
    expect(quorum.reached).toBe(true);
    expect(quorum.current).toBe(50); // 100 out of 200 total = 50%
  });

  it('should calculate results', async () => {
    const proposal = await manager.createProposal({
      organizationId: 'org_123',
      type: 'strategy_change',
      title: 'Test',
      description: 'Test',
      proposer: 'user_1',
      actions: [],
    });

    await manager.castVote({ proposalId: proposal.id, voter: 'user_1', support: 'for' });
    await manager.castVote({ proposalId: proposal.id, voter: 'user_2', support: 'against' });
    await manager.castVote({ proposalId: proposal.id, voter: 'user_3', support: 'for' });

    const results = manager.calculateResults(proposal.id);

    expect(results.votesFor).toBe(2);
    expect(results.votesAgainst).toBe(1);
    expect(results.votingPowerFor).toBe(150);
    expect(results.votingPowerAgainst).toBe(50);
    expect(results.approved).toBe(true);
  });

  it('should delegate voting power', async () => {
    const success = await manager.delegateVotingPower({
      fromUserId: 'user_3',
      toUserId: 'user_1',
      organizationId: 'org_123',
    });

    expect(success).toBe(true);
  });
});

// ============================================================================
// Fund Manager Tests
// ============================================================================

describe('FundManager', () => {
  let manager: ReturnType<typeof createFundManager>;

  beforeEach(() => {
    manager = createFundManager();
  });

  it('should create a fund', async () => {
    const fund = await manager.createFund({
      organizationId: 'org_123',
      name: 'Yield Fund Alpha',
      description: 'AI-managed yield optimization fund',
      type: 'yield_fund',
      strategy: { targetApy: 15 },
      fees: { managementFeePercent: 2, performanceFeePercent: 20 },
      compliance: { minInvestment: 100 },
    });

    expect(fund.id).toBeDefined();
    expect(fund.name).toBe('Yield Fund Alpha');
    expect(fund.type).toBe('yield_fund');
    expect(fund.status).toBe('fundraising');
    expect(fund.nav).toBe(100);
  });

  it('should launch a fund', async () => {
    const fund = await manager.createFund({
      organizationId: 'org_123',
      name: 'Test Fund',
      description: 'Test',
      type: 'balanced_fund',
      strategy: {},
      fees: {},
      compliance: {},
    });

    const result = await manager.launchFund(fund.id);

    expect(result.success).toBe(true);
    expect(result.initialNav).toBe(100);

    const launched = manager.getFund(fund.id);
    expect(launched?.status).toBe('active');
  });

  it('should add investors', async () => {
    const fund = await manager.createFund({
      organizationId: 'org_123',
      name: 'Test Fund',
      description: 'Test',
      type: 'hedge_fund',
      strategy: {},
      fees: {},
      compliance: {},
    });

    const investor = await manager.addInvestor({
      fundId: fund.id,
      userId: 'investor_1',
      initialInvestment: 1000,
    });

    expect(investor.id).toBeDefined();
    expect(investor.shares).toBe(10); // 1000 / 100 NAV
    expect(investor.investedCapital).toBe(1000);

    const updated = manager.getFund(fund.id);
    expect(updated?.aum).toBe(1000);
    expect(updated?.totalShares).toBe(10);
  });

  it('should process investments', async () => {
    const fund = await manager.createFund({
      organizationId: 'org_123',
      name: 'Test Fund',
      description: 'Test',
      type: 'hedge_fund',
      strategy: {},
      fees: {},
      compliance: {},
    });

    const investor = await manager.addInvestor({
      fundId: fund.id,
      userId: 'investor_1',
      initialInvestment: 1000,
    });

    const result = await manager.processInvestment(fund.id, investor.id, 500);

    expect(result.success).toBe(true);
    expect(result.sharesIssued).toBe(5);

    const updated = manager.getFund(fund.id);
    expect(updated?.aum).toBe(1500);
  });

  it('should process redemptions', async () => {
    const fund = await manager.createFund({
      organizationId: 'org_123',
      name: 'Test Fund',
      description: 'Test',
      type: 'hedge_fund',
      strategy: {},
      fees: {},
      compliance: { lockPeriodDays: 0 },
    });

    const investor = await manager.addInvestor({
      fundId: fund.id,
      userId: 'investor_1',
      initialInvestment: 1000,
    });

    const result = await manager.processRedemption({
      fundId: fund.id,
      investorId: investor.id,
      percentage: 50,
    });

    expect(result.success).toBe(true);
    expect(result.amountReturned).toBe(500);

    const updated = manager.getFund(fund.id);
    expect(updated?.aum).toBe(500);
  });

  it('should calculate NAV', async () => {
    const fund = await manager.createFund({
      organizationId: 'org_123',
      name: 'Test Fund',
      description: 'Test',
      type: 'hedge_fund',
      strategy: {},
      fees: {},
      compliance: {},
    });

    await manager.addInvestor({
      fundId: fund.id,
      userId: 'investor_1',
      initialInvestment: 1000,
    });

    const nav = await manager.calculateNav(fund.id);

    expect(nav.totalAssets).toBe(1000);
    expect(nav.navPerShare).toBe(100);
    expect(nav.breakdown.length).toBeGreaterThan(0);
  });

  it('should calculate returns', async () => {
    const fund = await manager.createFund({
      organizationId: 'org_123',
      name: 'Test Fund',
      description: 'Test',
      type: 'hedge_fund',
      strategy: {},
      fees: {},
      compliance: {},
    });

    await manager.addInvestor({
      fundId: fund.id,
      userId: 'investor_1',
      initialInvestment: 1000,
    });

    const returns = manager.calculateReturns(fund.id, 'monthly');

    expect(returns.fundId).toBe(fund.id);
    expect(returns.period).toBe('monthly');
  });
});

// ============================================================================
// Capital Pool Manager Tests
// ============================================================================

describe('CapitalPoolManager', () => {
  let manager: ReturnType<typeof createCapitalPoolManager>;

  beforeEach(() => {
    manager = createCapitalPoolManager();
  });

  it('should create a capital pool', async () => {
    const pool = await manager.createPool({
      organizationId: 'org_123',
      name: 'Main Treasury',
      description: 'Primary capital pool',
      type: 'general',
    });

    expect(pool.id).toBeDefined();
    expect(pool.name).toBe('Main Treasury');
    expect(pool.status).toBe('open');
    expect(pool.totalCapital).toBe(0);
  });

  it('should accept contributions', async () => {
    const pool = await manager.createPool({
      organizationId: 'org_123',
      name: 'Test Pool',
      description: 'Test',
      type: 'investment',
    });

    const result = await manager.contribute({
      poolId: pool.id,
      userId: 'user_1',
      amount: 1000,
    });

    expect(result.success).toBe(true);
    expect(result.sharePercent).toBe(100);

    const updated = manager.getPool(pool.id);
    expect(updated?.totalCapital).toBe(1000);
    expect(updated?.availableCapital).toBe(1000);
  });

  it('should track multiple contributors', async () => {
    const pool = await manager.createPool({
      organizationId: 'org_123',
      name: 'Test Pool',
      description: 'Test',
      type: 'investment',
    });

    await manager.contribute({ poolId: pool.id, userId: 'user_1', amount: 1000 });
    await manager.contribute({ poolId: pool.id, userId: 'user_2', amount: 500 });

    const contributors = manager.listContributors(pool.id);
    expect(contributors.length).toBe(2);

    const contributor1 = manager.getContributor(pool.id, 'user_1');
    expect(contributor1?.sharePercent).toBeCloseTo(66.67, 1);

    const contributor2 = manager.getContributor(pool.id, 'user_2');
    expect(contributor2?.sharePercent).toBeCloseTo(33.33, 1);
  });

  it('should allocate to agents', async () => {
    const pool = await manager.createPool({
      organizationId: 'org_123',
      name: 'Test Pool',
      description: 'Test',
      type: 'investment',
    });

    await manager.contribute({ poolId: pool.id, userId: 'user_1', amount: 1000 });

    const allocation = await manager.allocateToAgent({
      poolId: pool.id,
      agentId: 'agent_123',
      amount: 500,
      purpose: 'Yield farming',
    });

    expect(allocation.id).toBeDefined();
    expect(allocation.amount).toBe(500);

    const updated = manager.getPool(pool.id);
    expect(updated?.availableCapital).toBe(500);
    expect(updated?.allocatedCapital).toBe(500);
  });

  it('should not over-allocate', async () => {
    const pool = await manager.createPool({
      organizationId: 'org_123',
      name: 'Test Pool',
      description: 'Test',
      type: 'investment',
    });

    await manager.contribute({ poolId: pool.id, userId: 'user_1', amount: 1000 });

    await expect(
      manager.allocateToAgent({
        poolId: pool.id,
        agentId: 'agent_123',
        amount: 2000,
        purpose: 'Test',
      })
    ).rejects.toThrow('Insufficient available capital');
  });

  it('should process withdrawal requests', async () => {
    const pool = await manager.createPool({
      organizationId: 'org_123',
      name: 'Test Pool',
      description: 'Test',
      type: 'investment',
      limits: { lockPeriodDays: 0, withdrawalNoticeDays: 0 },
    });

    await manager.contribute({ poolId: pool.id, userId: 'user_1', amount: 1000 });
    const contributor = manager.getContributor(pool.id, 'user_1')!;

    const request = await manager.requestWithdrawal({
      poolId: pool.id,
      contributorId: contributor.id,
      percentage: 50,
    });

    expect(request.status).toBe('pending');
    expect(request.amount).toBe(500);

    // Process immediately since notice period is 0
    const result = await manager.processWithdrawal(request.id);

    expect(result.success).toBe(true);
    expect(result.amountWithdrawn).toBe(500);
  });

  it('should rebalance allocations', async () => {
    const pool = await manager.createPool({
      organizationId: 'org_123',
      name: 'Test Pool',
      description: 'Test',
      type: 'investment',
    });

    await manager.contribute({ poolId: pool.id, userId: 'user_1', amount: 1000 });

    await manager.allocateToAgent({ poolId: pool.id, agentId: 'agent_1', amount: 300, purpose: 'Test' });
    await manager.allocateToAgent({ poolId: pool.id, agentId: 'agent_2', amount: 100, purpose: 'Test' });

    const result = await manager.rebalanceAllocations(pool.id);

    expect(result.success).toBe(true);
    expect(result.adjustments.length).toBe(2);
  });
});

// ============================================================================
// Monitoring Manager Tests
// ============================================================================

describe('MonitoringManager', () => {
  let manager: ReturnType<typeof createMonitoringManager>;

  beforeEach(() => {
    manager = createMonitoringManager();
  });

  it('should create alerts', () => {
    const alert = manager.createAlert({
      organizationId: 'org_123',
      type: 'risk_threshold',
      severity: 'warning',
      title: 'High concentration risk',
      message: 'Single asset exceeds 30% of portfolio',
      source: 'risk_engine',
    });

    expect(alert.id).toBeDefined();
    expect(alert.acknowledged).toBe(false);
  });

  it('should filter alerts', () => {
    manager.createAlert({
      organizationId: 'org_123',
      type: 'risk_threshold',
      severity: 'warning',
      title: 'Warning 1',
      message: 'Test',
      source: 'test',
    });

    manager.createAlert({
      organizationId: 'org_123',
      type: 'agent_error',
      severity: 'error',
      title: 'Error 1',
      message: 'Test',
      source: 'test',
    });

    const allAlerts = manager.getAlerts('org_123');
    expect(allAlerts.length).toBe(2);

    const warnings = manager.getAlerts('org_123', { severity: ['warning'] });
    expect(warnings.length).toBe(1);

    const errors = manager.getAlerts('org_123', { type: ['agent_error'] });
    expect(errors.length).toBe(1);
  });

  it('should acknowledge alerts', async () => {
    const alert = manager.createAlert({
      organizationId: 'org_123',
      type: 'risk_threshold',
      severity: 'warning',
      title: 'Test',
      message: 'Test',
      source: 'test',
    });

    await manager.acknowledgeAlert(alert.id);

    const alerts = manager.getAlerts('org_123');
    expect(alerts[0].acknowledged).toBe(true);
  });

  it('should record agent data', () => {
    manager.recordAgentData('agent_123', {
      timestamp: new Date(),
      totalValue: 10000,
      pnl: 500,
      transactionCount: 10,
      errorCount: 0,
      status: 'active',
    });

    const history = manager.getHistoricalMetrics('org_123', 'totalValue', 30);
    // History might be empty since we don't have registered agents
    expect(history).toBeDefined();
  });

  it('should record transactions', () => {
    manager.recordTreasuryTransaction('org_123', {
      id: 'tx_1',
      type: 'swap',
      amount: 100,
      token: 'TON',
      timestamp: new Date(),
      status: 'confirmed',
    });

    // Transactions are tracked internally
    const metrics = manager.getTreasuryMetrics('org_123');
    expect(metrics.recentTransactions.length).toBe(1);
  });

  it('should get dashboard', async () => {
    const dashboard = await manager.getDashboard('org_123');

    expect(dashboard.organizationId).toBe('org_123');
    expect(dashboard.overview).toBeDefined();
    expect(dashboard.treasuryMetrics).toBeDefined();
    expect(dashboard.agentMetrics).toBeDefined();
    expect(dashboard.capitalMetrics).toBeDefined();
    expect(dashboard.governanceMetrics).toBeDefined();
    expect(dashboard.riskMetrics).toBeDefined();
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Launchpad Integration', () => {
  it('should complete full workflow: org -> pool -> agent -> governance', async () => {
    const launchpad = createLaunchpadService();
    const events: LaunchpadEvent[] = [];
    launchpad.onEvent((e) => events.push(e));

    // 1. Create organization
    const org = await launchpad.organizations.createOrganization({
      name: 'Acme DAO',
      description: 'Community-governed treasury',
      type: 'dao',
      creatorUserId: 'founder_1',
    });
    expect(org.id).toBeDefined();

    // 2. Add members
    await launchpad.organizations.addMember({
      organizationId: org.id,
      userId: 'member_1',
      email: 'member1@test.com',
      name: 'Member One',
      role: 'treasury_manager',
      invitedBy: 'founder_1',
    });

    // 3. Create capital pool
    const pool = await launchpad.pools.createPool({
      organizationId: org.id,
      name: 'Treasury Pool',
      description: 'Main capital pool',
      type: 'general',
    });
    expect(pool.id).toBeDefined();

    // 4. Add contributions
    await launchpad.pools.contribute({
      poolId: pool.id,
      userId: 'founder_1',
      amount: 5000,
    });

    await launchpad.pools.contribute({
      poolId: pool.id,
      userId: 'member_1',
      amount: 3000,
    });

    const poolState = launchpad.pools.getPool(pool.id);
    expect(poolState?.totalCapital).toBe(8000);

    // 5. Create treasury agent
    const agent = await launchpad.agents.createAgent({
      organizationId: org.id,
      name: 'Yield Optimizer',
      description: 'Automated yield farming',
      type: 'yield',
      config: { capitalAllocated: 5000 },
      strategy: { type: 'yield_optimization', yieldTargetApy: 15 },
    });

    // 6. Deploy agent
    const deployment = await launchpad.agents.deployAgent(agent.id);
    expect(deployment.success).toBe(true);

    // 7. Allocate capital to agent
    await launchpad.pools.allocateToAgent({
      poolId: pool.id,
      agentId: agent.id,
      amount: 5000,
      purpose: 'Yield optimization',
    });

    // 8. Configure governance
    await launchpad.governance.configureGovernance(org.id, {
      type: 'token_voting',
      quorumPercent: 20,
    });

    // Set voting power
    launchpad.governance.setMemberVotingPower(org.id, 'founder_1', 50);
    launchpad.governance.setMemberVotingPower(org.id, 'member_1', 30);

    // 9. Create governance proposal
    const proposal = await launchpad.governance.createProposal({
      organizationId: org.id,
      agentId: agent.id,
      type: 'strategy_change',
      title: 'Increase yield target',
      description: 'Increase target APY from 15% to 20%',
      proposer: 'member_1',
      actions: [
        { type: 'parameter_change', target: 'yield_target', parameters: { value: 20 } },
      ],
    });

    // 10. Vote on proposal
    await launchpad.governance.castVote({
      proposalId: proposal.id,
      voter: 'founder_1',
      support: 'for',
    });

    const results = launchpad.governance.calculateResults(proposal.id);
    expect(results.votesFor).toBe(1);
    expect(results.votingPowerFor).toBe(50);

    // Verify events were captured
    expect(events.length).toBeGreaterThan(5);
    expect(events.some((e) => e.type === 'organization_created')).toBe(true);
    expect(events.some((e) => e.type === 'pool_created')).toBe(true);
    expect(events.some((e) => e.type === 'capital_contributed')).toBe(true);
    expect(events.some((e) => e.type === 'agent_started')).toBe(true);
    expect(events.some((e) => e.type === 'proposal_created')).toBe(true);
  });

  it('should create and manage an AI fund', async () => {
    const launchpad = createLaunchpadService();

    // Create organization for the fund
    const org = await launchpad.organizations.createOrganization({
      name: 'Alpha Capital',
      description: 'AI-managed crypto hedge fund',
      type: 'hedge_fund',
      creatorUserId: 'gp_1',
    });

    // Create the fund
    const fund = await launchpad.funds.createFund({
      organizationId: org.id,
      name: 'Alpha AI Fund',
      description: 'AI-driven multi-strategy fund',
      type: 'hedge_fund',
      strategy: {
        name: 'Multi-Strategy AI',
        targetApy: 25,
        riskLevel: 'aggressive',
      },
      fees: {
        managementFeePercent: 2,
        performanceFeePercent: 20,
      },
      compliance: {
        accreditedOnly: true,
        minInvestment: 10000,
        lockPeriodDays: 90,
      },
    });

    expect(fund.status).toBe('fundraising');

    // Add investors
    await launchpad.funds.addInvestor({
      fundId: fund.id,
      userId: 'investor_1',
      initialInvestment: 50000,
    });

    await launchpad.funds.addInvestor({
      fundId: fund.id,
      userId: 'investor_2',
      initialInvestment: 30000,
    });

    // Launch the fund
    const launchResult = await launchpad.funds.launchFund(fund.id);
    expect(launchResult.success).toBe(true);

    // Check AUM
    const fundState = launchpad.funds.getFund(fund.id);
    expect(fundState?.aum).toBe(80000);
    expect(fundState?.status).toBe('active');

    // Calculate NAV
    const nav = await launchpad.funds.calculateNav(fund.id);
    expect(nav.navPerShare).toBe(100);

    // Update NAV (simulating profits)
    await launchpad.funds.updateNav(fund.id, 110);

    // Check investor values
    const investors = launchpad.funds.listInvestors(fund.id);
    const investor1 = investors.find((i) => i.userId === 'investor_1')!;
    expect(investor1.currentValue).toBe(55000); // 500 shares * 110 NAV
    expect(investor1.unrealizedPnl).toBe(5000); // 55000 - 50000
  });
});

// ============================================================================
// Default Role Permissions Tests
// ============================================================================

describe('Default Role Permissions', () => {
  it('should have correct permissions for owner', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.owner.canManageAgents).toBe(true);
    expect(DEFAULT_ROLE_PERMISSIONS.owner.canManageTreasury).toBe(true);
    expect(DEFAULT_ROLE_PERMISSIONS.owner.canManageMembers).toBe(true);
    expect(DEFAULT_ROLE_PERMISSIONS.owner.canManageSettings).toBe(true);
  });

  it('should have correct permissions for viewer', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.viewer.canManageAgents).toBe(false);
    expect(DEFAULT_ROLE_PERMISSIONS.viewer.canVote).toBe(false);
    expect(DEFAULT_ROLE_PERMISSIONS.viewer.canViewReports).toBe(true);
    expect(DEFAULT_ROLE_PERMISSIONS.viewer.canCreateProposals).toBe(false);
  });

  it('should have correct permissions for treasury_manager', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.treasury_manager.canManageTreasury).toBe(true);
    expect(DEFAULT_ROLE_PERMISSIONS.treasury_manager.canManageAgents).toBe(true);
    expect(DEFAULT_ROLE_PERMISSIONS.treasury_manager.canManageMembers).toBe(false);
  });
});
