/**
 * Tests for Multi-User Portfolio Management
 *
 * Issue #160: Multi-User Portfolio Management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMultiUserPortfolioManager,
  MultiUserPortfolioManager,
  createPortfolioPermissionsManager,
  createSharedPortfolioManager,
  createCollaborativeStrategyManager,
  createTeamAnalyticsManager,
  createActivityLogManager,
  createInstitutionalPortfolioManager,
  PORTFOLIO_ROLES,
} from '../../core/portfolio/multi-user';

// ============================================================================
// Helpers
// ============================================================================

function createValidPortfolioInput() {
  return {
    name: 'Test Portfolio',
    ownerId: 'user_owner',
    description: 'A test portfolio',
    metadata: { riskTolerance: 'medium' as const, fundType: 'hedge_fund' as const },
    settings: { requireApprovalForTrades: false, allowAnalystProposals: true, notifyOnTrades: true, notifyOnStrategyChanges: true, reportingFrequency: 'monthly' as const },
  };
}

function createValidFundInput(portfolioId: string) {
  return {
    portfolioId,
    name: 'Test Fund',
    description: 'A test institutional fund',
    fundType: 'hedge_fund' as const,
    minimumInvestmentUsd: 100000,
    managementFeePercent: 2,
    performanceFeePercent: 20,
  };
}

// ============================================================================
// Portfolio Permissions Manager
// ============================================================================

describe('PortfolioPermissionsManager', () => {
  let manager: ReturnType<typeof createPortfolioPermissionsManager>;

  beforeEach(() => {
    manager = createPortfolioPermissionsManager();
  });

  describe('roles', () => {
    it('should have 4 system roles', () => {
      const roles = manager.listRoles();
      expect(roles).toHaveLength(4);
      const names = roles.map(r => r.name);
      expect(names).toContain('owner');
      expect(names).toContain('manager');
      expect(names).toContain('analyst');
      expect(names).toContain('viewer');
    });

    it('should return correct role for each name', () => {
      const ownerRole = manager.getRole('owner');
      expect(ownerRole.name).toBe('owner');
      expect(ownerRole.displayName).toBe('Portfolio Owner');
    });

    it('should throw for unknown role', () => {
      expect(() => manager.getRole('unknown' as never)).toThrow('Unknown portfolio role: unknown');
    });
  });

  describe('permission resolution', () => {
    it('owner should have all permissions', () => {
      const permissions = manager.resolvePermissions('owner');
      expect(permissions.some(p => p.resource === 'trade' && p.action === 'execute')).toBe(true);
      expect(permissions.some(p => p.resource === 'member' && p.action === 'invite')).toBe(true);
      expect(permissions.some(p => p.resource === 'portfolio' && p.action === 'delete')).toBe(true);
    });

    it('manager should be able to execute trades', () => {
      const permissions = manager.resolvePermissions('manager');
      expect(permissions.some(p => p.resource === 'trade' && p.action === 'execute')).toBe(true);
    });

    it('analyst should be able to propose strategies but not execute trades', () => {
      const permissions = manager.resolvePermissions('analyst');
      expect(permissions.some(p => p.resource === 'strategy' && p.action === 'propose')).toBe(true);
      expect(permissions.some(p => p.resource === 'trade' && p.action === 'execute')).toBe(false);
    });

    it('viewer should only have read permissions', () => {
      const permissions = manager.resolvePermissions('viewer');
      expect(permissions.every(p => p.action === 'read')).toBe(true);
    });
  });

  describe('hasPermission', () => {
    it('owner can execute trades', () => {
      expect(manager.hasPermission('owner', 'trade', 'execute')).toBe(true);
    });

    it('manager can execute trades', () => {
      expect(manager.hasPermission('manager', 'trade', 'execute')).toBe(true);
    });

    it('analyst cannot execute trades', () => {
      expect(manager.hasPermission('analyst', 'trade', 'execute')).toBe(false);
    });

    it('viewer cannot execute trades', () => {
      expect(manager.hasPermission('viewer', 'trade', 'execute')).toBe(false);
    });

    it('analyst can propose strategies', () => {
      expect(manager.hasPermission('analyst', 'strategy', 'propose')).toBe(true);
    });

    it('viewer cannot propose strategies', () => {
      expect(manager.hasPermission('viewer', 'strategy', 'propose')).toBe(false);
    });

    it('owner can invite members', () => {
      expect(manager.hasPermission('owner', 'member', 'invite')).toBe(true);
    });

    it('viewer cannot invite members', () => {
      expect(manager.hasPermission('viewer', 'member', 'invite')).toBe(false);
    });
  });

  describe('checkAccess', () => {
    it('should deny access for non-members', () => {
      const result = manager.checkAccess(
        { portfolioId: 'p1', userId: 'unknown_user', resource: 'portfolio', action: 'read' },
        [],
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not a member');
    });

    it('should allow access for members with sufficient permissions', () => {
      const members = [{
        id: 'm1', portfolioId: 'p1', userId: 'user1', role: 'viewer' as const,
        invitedBy: 'owner', joinedAt: new Date(), status: 'active' as const,
        permissions: manager.resolvePermissions('viewer'),
      }];

      const result = manager.checkAccess(
        { portfolioId: 'p1', userId: 'user1', resource: 'portfolio', action: 'read' },
        members,
      );
      expect(result.allowed).toBe(true);
      expect(result.userRole).toBe('viewer');
    });

    it('should deny access for members without sufficient permissions', () => {
      const members = [{
        id: 'm1', portfolioId: 'p1', userId: 'user1', role: 'viewer' as const,
        invitedBy: 'owner', joinedAt: new Date(), status: 'active' as const,
        permissions: manager.resolvePermissions('viewer'),
      }];

      const result = manager.checkAccess(
        { portfolioId: 'p1', userId: 'user1', resource: 'trade', action: 'execute' },
        members,
      );
      expect(result.allowed).toBe(false);
      expect(result.requiredRoles).toContain('owner');
      expect(result.requiredRoles).toContain('manager');
    });

    it('should deny access for suspended members', () => {
      const members = [{
        id: 'm1', portfolioId: 'p1', userId: 'user1', role: 'manager' as const,
        invitedBy: 'owner', joinedAt: new Date(), status: 'suspended' as const,
        permissions: manager.resolvePermissions('manager'),
      }];

      const result = manager.checkAccess(
        { portfolioId: 'p1', userId: 'user1', resource: 'trade', action: 'execute' },
        members,
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('suspended');
    });

    it('should emit events on access denial', () => {
      const events: unknown[] = [];
      manager.onEvent(event => events.push(event));

      manager.checkAccess(
        { portfolioId: 'p1', userId: 'unknown', resource: 'trade', action: 'execute' },
        [],
      );

      expect(events.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Shared Portfolio Manager
// ============================================================================

describe('SharedPortfolioManager', () => {
  let manager: ReturnType<typeof createSharedPortfolioManager>;

  beforeEach(() => {
    manager = createSharedPortfolioManager();
  });

  describe('createPortfolio', () => {
    it('should create a portfolio with the owner as first member', async () => {
      const portfolio = await manager.createPortfolio(createValidPortfolioInput());
      expect(portfolio.id).toBeTruthy();
      expect(portfolio.name).toBe('Test Portfolio');
      expect(portfolio.ownerId).toBe('user_owner');
      expect(portfolio.status).toBe('active');
      expect(portfolio.members).toHaveLength(1);
      expect(portfolio.members[0].userId).toBe('user_owner');
      expect(portfolio.members[0].role).toBe('owner');
    });

    it('should create a portfolio with initial members', async () => {
      const input = {
        ...createValidPortfolioInput(),
        initialMembers: [
          { userId: 'user_manager', role: 'manager' as const },
          { userId: 'user_analyst', role: 'analyst' as const },
        ],
      };

      const portfolio = await manager.createPortfolio(input);
      expect(portfolio.members).toHaveLength(3);
      const managerMember = portfolio.members.find(m => m.userId === 'user_manager');
      expect(managerMember?.role).toBe('manager');
    });

    it('should not duplicate owner in initial members', async () => {
      const input = {
        ...createValidPortfolioInput(),
        initialMembers: [
          { userId: 'user_owner', role: 'manager' as const }, // should be skipped
        ],
      };

      const portfolio = await manager.createPortfolio(input);
      expect(portfolio.members).toHaveLength(1);
      expect(portfolio.members[0].role).toBe('owner');
    });

    it('should emit portfolio_created event', async () => {
      const events: unknown[] = [];
      manager.onEvent(event => events.push(event));

      await manager.createPortfolio(createValidPortfolioInput());

      expect(events).toHaveLength(1);
      expect((events[0] as { type: string }).type).toBe('portfolio_created');
    });
  });

  describe('getPortfolio and listPortfolios', () => {
    it('should return undefined for unknown portfolio', () => {
      expect(manager.getPortfolio('unknown')).toBeUndefined();
    });

    it('should return created portfolio', async () => {
      const portfolio = await manager.createPortfolio(createValidPortfolioInput());
      const retrieved = manager.getPortfolio(portfolio.id);
      expect(retrieved?.id).toBe(portfolio.id);
    });

    it('should list all portfolios', async () => {
      await manager.createPortfolio({ ...createValidPortfolioInput(), name: 'P1' });
      await manager.createPortfolio({ ...createValidPortfolioInput(), name: 'P2' });
      const all = manager.listPortfolios();
      expect(all).toHaveLength(2);
    });

    it('should list portfolios by owner', async () => {
      await manager.createPortfolio({ ...createValidPortfolioInput(), ownerId: 'owner1' });
      await manager.createPortfolio({ ...createValidPortfolioInput(), ownerId: 'owner2' });
      const owner1Portfolios = manager.listPortfolios('owner1');
      expect(owner1Portfolios).toHaveLength(1);
    });
  });

  describe('member management', () => {
    it('should add a new member', async () => {
      const portfolio = await manager.createPortfolio(createValidPortfolioInput());
      const member = await manager.addMember({
        portfolioId: portfolio.id,
        userId: 'new_user',
        role: 'analyst',
        invitedBy: 'user_owner',
      });

      expect(member.userId).toBe('new_user');
      expect(member.role).toBe('analyst');
      expect(member.status).toBe('active');
    });

    it('should throw when adding duplicate member', async () => {
      const portfolio = await manager.createPortfolio(createValidPortfolioInput());
      await manager.addMember({
        portfolioId: portfolio.id,
        userId: 'new_user',
        role: 'analyst',
        invitedBy: 'user_owner',
      });

      await expect(manager.addMember({
        portfolioId: portfolio.id,
        userId: 'new_user',
        role: 'viewer',
        invitedBy: 'user_owner',
      })).rejects.toThrow('already a member');
    });

    it('should remove a non-owner member', async () => {
      const portfolio = await manager.createPortfolio(createValidPortfolioInput());
      await manager.addMember({
        portfolioId: portfolio.id,
        userId: 'new_user',
        role: 'analyst',
        invitedBy: 'user_owner',
      });

      await manager.removeMember(portfolio.id, 'new_user', 'user_owner');

      const updated = manager.getPortfolio(portfolio.id)!;
      expect(updated.members.find(m => m.userId === 'new_user')).toBeUndefined();
    });

    it('should throw when removing the owner', async () => {
      const portfolio = await manager.createPortfolio(createValidPortfolioInput());
      await expect(
        manager.removeMember(portfolio.id, 'user_owner', 'user_owner'),
      ).rejects.toThrow('Cannot remove the portfolio owner');
    });

    it('should update member role', async () => {
      const portfolio = await manager.createPortfolio(createValidPortfolioInput());
      await manager.addMember({
        portfolioId: portfolio.id,
        userId: 'new_user',
        role: 'analyst',
        invitedBy: 'user_owner',
      });

      const updated = await manager.updateMemberRole(portfolio.id, 'new_user', 'manager', 'user_owner');
      expect(updated.role).toBe('manager');
    });

    it('should suspend and reactivate members', async () => {
      const portfolio = await manager.createPortfolio(createValidPortfolioInput());
      await manager.addMember({
        portfolioId: portfolio.id,
        userId: 'new_user',
        role: 'analyst',
        invitedBy: 'user_owner',
      });

      const suspended = await manager.suspendMember(portfolio.id, 'new_user', 'user_owner');
      expect(suspended.status).toBe('suspended');

      const reactivated = await manager.reactivateMember(portfolio.id, 'new_user', 'user_owner');
      expect(reactivated.status).toBe('active');
    });
  });

  describe('portfolio status', () => {
    it('should archive a portfolio', async () => {
      const portfolio = await manager.createPortfolio(createValidPortfolioInput());
      const archived = await manager.archivePortfolio(portfolio.id, 'user_owner');
      expect(archived.status).toBe('archived');
    });

    it('should update portfolio value', async () => {
      const portfolio = await manager.createPortfolio(createValidPortfolioInput());
      const updated = await manager.updatePortfolioValue(portfolio.id, 1000000);
      expect(updated.totalValueUsd).toBe(1000000);
    });
  });
});

// ============================================================================
// Collaborative Strategy Manager
// ============================================================================

describe('CollaborativeStrategyManager', () => {
  let manager: ReturnType<typeof createCollaborativeStrategyManager>;

  beforeEach(() => {
    manager = createCollaborativeStrategyManager();
    manager.setCurrentAllocations('p1', [
      { assetId: 'BTC', assetName: 'Bitcoin', currentPercent: 30, currentValueUsd: 300000 },
      { assetId: 'ETH', assetName: 'Ethereum', currentPercent: 40, currentValueUsd: 400000 },
    ]);
  });

  function createProposalInput() {
    return {
      portfolioId: 'p1',
      proposedBy: 'user_analyst',
      title: 'Increase BTC allocation',
      description: 'Rebalance toward BTC',
      proposedAllocations: [
        { assetId: 'BTC', assetName: 'Bitcoin', targetPercent: 40, currentPercent: 30 },
        { assetId: 'ETH', assetName: 'Ethereum', targetPercent: 30, currentPercent: 40 },
      ],
      rationale: 'BTC dominance increasing',
    };
  }

  describe('createProposal', () => {
    it('should create a draft proposal', async () => {
      const proposal = await manager.createProposal(createProposalInput());
      expect(proposal.id).toBeTruthy();
      expect(proposal.status).toBe('draft');
      expect(proposal.proposedBy).toBe('user_analyst');
    });

    it('should calculate change percent relative to current allocations', async () => {
      const proposal = await manager.createProposal(createProposalInput());
      const btcAlloc = proposal.proposedAllocations.find(a => a.assetId === 'BTC')!;
      expect(btcAlloc.changePercent).toBe(10); // 40 - 30 = 10
    });

    it('should include current allocations snapshot', async () => {
      const proposal = await manager.createProposal(createProposalInput());
      expect(proposal.currentAllocations).toHaveLength(2);
    });

    it('should emit strategy_proposed event', async () => {
      const events: unknown[] = [];
      manager.onEvent(event => events.push(event));

      await manager.createProposal(createProposalInput());

      expect(events).toHaveLength(1);
      expect((events[0] as { type: string }).type).toBe('strategy_proposed');
    });
  });

  describe('proposal lifecycle', () => {
    it('should submit for review', async () => {
      const proposal = await manager.createProposal(createProposalInput());
      const submitted = await manager.submitForReview(proposal.id, 'user_analyst');
      expect(submitted.status).toBe('pending_review');
    });

    it('should not allow submitting by non-author', async () => {
      const proposal = await manager.createProposal(createProposalInput());
      await expect(manager.submitForReview(proposal.id, 'other_user')).rejects.toThrow('Only the proposal author');
    });

    it('should approve a pending proposal', async () => {
      const proposal = await manager.createProposal(createProposalInput());
      await manager.submitForReview(proposal.id, 'user_analyst');
      const approved = await manager.approveProposal(proposal.id, 'user_manager', 'Looks good');
      expect(approved.status).toBe('approved');
      expect(approved.reviewedBy).toBe('user_manager');
      expect(approved.reviewNotes).toBe('Looks good');
    });

    it('should reject a pending proposal', async () => {
      const proposal = await manager.createProposal(createProposalInput());
      await manager.submitForReview(proposal.id, 'user_analyst');
      const rejected = await manager.rejectProposal(proposal.id, 'user_manager', 'Not the right time');
      expect(rejected.status).toBe('rejected');
      expect(rejected.reviewNotes).toBe('Not the right time');
    });

    it('should withdraw a draft or pending proposal', async () => {
      const proposal = await manager.createProposal(createProposalInput());
      const withdrawn = await manager.withdrawProposal(proposal.id, 'user_analyst');
      expect(withdrawn.status).toBe('withdrawn');
    });

    it('should mark proposal as implemented after approval', async () => {
      const proposal = await manager.createProposal(createProposalInput());
      await manager.submitForReview(proposal.id, 'user_analyst');
      await manager.approveProposal(proposal.id, 'user_manager');
      const implemented = await manager.markImplemented(proposal.id, 'user_manager');
      expect(implemented.status).toBe('implemented');
      expect(implemented.implementedAt).toBeDefined();
    });

    it('should not allow approving a non-pending proposal', async () => {
      const proposal = await manager.createProposal(createProposalInput());
      await expect(
        manager.approveProposal(proposal.id, 'user_manager'),
      ).rejects.toThrow("'pending_review'");
    });
  });

  describe('voting', () => {
    it('should cast a vote on a pending proposal', async () => {
      const proposal = await manager.createProposal(createProposalInput());
      await manager.submitForReview(proposal.id, 'user_analyst');

      const vote = await manager.castVote(proposal.id, 'user_manager', 'approve', 'Great idea');
      expect(vote.vote).toBe('approve');
      expect(vote.comment).toBe('Great idea');
    });

    it('should update existing vote from same voter', async () => {
      const proposal = await manager.createProposal(createProposalInput());
      await manager.submitForReview(proposal.id, 'user_analyst');

      await manager.castVote(proposal.id, 'user_manager', 'approve');
      await manager.castVote(proposal.id, 'user_manager', 'reject', 'Changed my mind');

      const votes = manager.getVotes(proposal.id);
      const managerVotes = votes.filter(v => v.voterId === 'user_manager');
      expect(managerVotes).toHaveLength(1);
      expect(managerVotes[0].vote).toBe('reject');
    });

    it('should not allow voting on non-pending proposals', async () => {
      const proposal = await manager.createProposal(createProposalInput());
      await expect(
        manager.castVote(proposal.id, 'user_manager', 'approve'),
      ).rejects.toThrow("'pending_review'");
    });
  });

  describe('listing proposals', () => {
    it('should list proposals by portfolio', async () => {
      await manager.createProposal(createProposalInput());
      await manager.createProposal({ ...createProposalInput(), portfolioId: 'p2' });

      const p1Proposals = manager.listProposals('p1');
      expect(p1Proposals).toHaveLength(1);
    });

    it('should filter proposals by status', async () => {
      const p1 = await manager.createProposal(createProposalInput());
      const p2 = await manager.createProposal(createProposalInput());
      await manager.submitForReview(p2.id, 'user_analyst');

      const drafts = manager.listProposals('p1', 'draft');
      expect(drafts).toHaveLength(1);

      const pending = manager.listProposals('p1', 'pending_review');
      expect(pending).toHaveLength(1);
    });
  });
});

// ============================================================================
// Team Analytics Manager
// ============================================================================

describe('TeamAnalyticsManager', () => {
  let manager: ReturnType<typeof createTeamAnalyticsManager>;

  beforeEach(() => {
    manager = createTeamAnalyticsManager();

    // Add some portfolio snapshots
    const now = new Date();
    manager.recordSnapshot({
      portfolioId: 'p1',
      timestamp: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      totalValueUsd: 1000000,
      allocations: [
        { assetId: 'BTC', assetName: 'Bitcoin', valueUsd: 500000, percent: 50 },
        { assetId: 'ETH', assetName: 'Ethereum', valueUsd: 300000, percent: 30 },
        { assetId: 'TON', assetName: 'TON', valueUsd: 200000, percent: 20 },
      ],
    });
    manager.recordSnapshot({
      portfolioId: 'p1',
      timestamp: now,
      totalValueUsd: 1100000,
      allocations: [
        { assetId: 'BTC', assetName: 'Bitcoin', valueUsd: 600000, percent: 54.5 },
        { assetId: 'ETH', assetName: 'Ethereum', valueUsd: 300000, percent: 27.3 },
        { assetId: 'TON', assetName: 'TON', valueUsd: 200000, percent: 18.2 },
      ],
    });

    // Add some trades
    manager.recordTrade({
      id: 't1',
      portfolioId: 'p1',
      executedBy: 'user_manager',
      assetId: 'BTC',
      assetName: 'Bitcoin',
      side: 'buy',
      amountUsd: 50000,
      executedAt: now,
      profitable: true,
      pnlUsd: 5000,
    });
  });

  describe('getPerformance', () => {
    it('should return portfolio performance metrics', () => {
      const performance = manager.getPerformance('p1');
      expect(performance.totalValueUsd).toBe(1100000);
      expect(performance.returnPercent).toBeCloseTo(10, 1);
      expect(performance.returnUsd).toBe(100000);
      expect(performance.totalTrades).toBe(1);
      expect(performance.profitableTrades).toBe(1);
      expect(performance.winRate).toBe(1);
    });

    it('should return zero performance for unknown portfolio', () => {
      const performance = manager.getPerformance('unknown');
      expect(performance.totalValueUsd).toBe(0);
      expect(performance.returnPercent).toBe(0);
    });
  });

  describe('getRiskExposure', () => {
    it('should return risk exposure metrics', () => {
      const risk = manager.getRiskExposure('p1');
      expect(risk.overallRiskScore).toBeGreaterThan(0);
      expect(risk.topConcentrations.length).toBeGreaterThan(0);
      expect(risk.topConcentrations[0].assetId).toBe('BTC'); // highest allocation
      expect(risk.diversificationScore).toBeGreaterThan(0);
    });

    it('should return zero risk for unknown portfolio', () => {
      const risk = manager.getRiskExposure('unknown');
      expect(risk.overallRiskScore).toBe(0);
      expect(risk.topConcentrations).toHaveLength(0);
      expect(risk.diversificationScore).toBe(100);
    });
  });

  describe('getStrategyContributions', () => {
    it('should return empty array with no strategies', () => {
      const contributions = manager.getStrategyContributions('p1');
      expect(contributions).toHaveLength(0);
    });

    it('should return strategy contributions after setting them', () => {
      manager.setStrategies('p1', [
        {
          id: 's1',
          portfolioId: 'p1',
          name: 'BTC Momentum',
          allocationPercent: 50,
          returnContributionPercent: 6,
          riskContributionPercent: 30,
          proposedBy: 'user_analyst',
        },
      ]);

      const contributions = manager.getStrategyContributions('p1');
      expect(contributions).toHaveLength(1);
      expect(contributions[0].strategyName).toBe('BTC Momentum');
    });
  });

  describe('getMemberActivity', () => {
    it('should summarize member activity from log', () => {
      const members = [
        { userId: 'user_manager', role: 'manager' as const },
        { userId: 'user_analyst', role: 'analyst' as const },
      ];

      const activityLog = [
        {
          id: 'a1', portfolioId: 'p1', actorId: 'user_manager', actorRole: 'manager' as const,
          type: 'trade_executed' as const, severity: 'info' as const, title: 'Trade', description: '',
          metadata: {}, timestamp: new Date(), notificationsSent: [],
        },
        {
          id: 'a2', portfolioId: 'p1', actorId: 'user_analyst', actorRole: 'analyst' as const,
          type: 'strategy_proposed' as const, severity: 'info' as const, title: 'Proposal', description: '',
          metadata: {}, timestamp: new Date(), notificationsSent: [],
        },
      ];

      const activity = manager.getMemberActivity('p1', members, activityLog);
      expect(activity).toHaveLength(2);

      const managerActivity = activity.find(a => a.userId === 'user_manager')!;
      expect(managerActivity.tradesExecuted).toBe(1);

      const analystActivity = activity.find(a => a.userId === 'user_analyst')!;
      expect(analystActivity.strategiesProposed).toBe(1);
    });
  });

  describe('getDashboard', () => {
    it('should generate a complete analytics dashboard', () => {
      const members = [{ userId: 'user_manager', role: 'manager' as const }];
      const dashboard = manager.getDashboard('p1', members, [], '30d');

      expect(dashboard.portfolioId).toBe('p1');
      expect(dashboard.period.label).toBe('30d');
      expect(dashboard.portfolioPerformance).toBeDefined();
      expect(dashboard.riskExposure).toBeDefined();
      expect(dashboard.strategyContributions).toBeDefined();
      expect(dashboard.memberActivity).toHaveLength(1);
      expect(dashboard.generatedAt).toBeDefined();
    });

    it('should emit report_generated event', () => {
      const events: unknown[] = [];
      manager.onEvent(event => events.push(event));

      manager.getDashboard('p1', [], [], '7d');

      expect(events).toHaveLength(1);
      expect((events[0] as { type: string }).type).toBe('report_generated');
    });
  });
});

// ============================================================================
// Activity Log Manager
// ============================================================================

describe('ActivityLogManager', () => {
  let manager: ReturnType<typeof createActivityLogManager>;

  beforeEach(() => {
    manager = createActivityLogManager();
  });

  describe('recordActivity', () => {
    it('should create an activity log entry', async () => {
      const entry = await manager.recordActivity({
        portfolioId: 'p1',
        actorId: 'user_manager',
        actorRole: 'manager',
        type: 'trade_executed',
        title: 'Trade executed',
        description: 'Bought 1 BTC',
        metadata: { assetId: 'BTC', amount: 50000 },
      });

      expect(entry.id).toBeTruthy();
      expect(entry.portfolioId).toBe('p1');
      expect(entry.actorId).toBe('user_manager');
      expect(entry.type).toBe('trade_executed');
      expect(entry.severity).toBe('info');
    });

    it('should send platform notifications to specified users', async () => {
      manager.setNotificationConfig('p1', {
        enablePlatformNotifications: true,
        enableTelegramNotifications: false,
        notifyOnSeverity: ['warning', 'critical'],
      });

      const entry = await manager.recordActivity({
        portfolioId: 'p1',
        actorId: 'user_manager',
        actorRole: 'manager',
        type: 'strategy_proposed',
        title: 'Strategy change',
        description: 'Critical strategy update',
        severity: 'warning',
        notifyUserIds: ['user_owner', 'user_viewer'],
      });

      expect(entry.notificationsSent).toHaveLength(2);
      expect(entry.notificationsSent[0].channel).toBe('platform');
    });
  });

  describe('listEntries', () => {
    it('should filter entries by portfolio', async () => {
      await manager.recordActivity({
        portfolioId: 'p1', actorId: 'u1', actorRole: 'owner',
        type: 'trade_executed', title: 'T1', description: '',
      });
      await manager.recordActivity({
        portfolioId: 'p2', actorId: 'u1', actorRole: 'owner',
        type: 'trade_executed', title: 'T2', description: '',
      });

      const p1Entries = manager.listEntries({ portfolioId: 'p1' });
      expect(p1Entries).toHaveLength(1);
    });

    it('should filter entries by type', async () => {
      await manager.recordActivity({
        portfolioId: 'p1', actorId: 'u1', actorRole: 'manager',
        type: 'trade_executed', title: 'Trade', description: '',
      });
      await manager.recordActivity({
        portfolioId: 'p1', actorId: 'u1', actorRole: 'analyst',
        type: 'strategy_proposed', title: 'Proposal', description: '',
      });

      const trades = manager.listEntries({ portfolioId: 'p1', types: ['trade_executed'] });
      expect(trades).toHaveLength(1);
    });

    it('should apply limit', async () => {
      for (let i = 0; i < 5; i++) {
        await manager.recordActivity({
          portfolioId: 'p1', actorId: 'u1', actorRole: 'manager',
          type: 'trade_executed', title: `Trade ${i}`, description: '',
        });
      }

      const entries = manager.listEntries({ portfolioId: 'p1', limit: 3 });
      expect(entries).toHaveLength(3);
    });

    it('should sort entries by most recent first', async () => {
      await manager.recordActivity({
        portfolioId: 'p1', actorId: 'u1', actorRole: 'manager',
        type: 'trade_executed', title: 'First', description: '',
      });
      await manager.recordActivity({
        portfolioId: 'p1', actorId: 'u1', actorRole: 'manager',
        type: 'trade_executed', title: 'Second', description: '',
      });

      const entries = manager.listEntries({ portfolioId: 'p1' });
      expect(entries[0].title).toBe('Second');
    });
  });

  describe('getPortfolioActivity and getUserActivity', () => {
    it('should get portfolio activity', async () => {
      await manager.recordActivity({
        portfolioId: 'p1', actorId: 'u1', actorRole: 'manager',
        type: 'trade_executed', title: 'Trade', description: '',
      });

      const entries = manager.getPortfolioActivity('p1');
      expect(entries).toHaveLength(1);
    });

    it('should get user activity', async () => {
      await manager.recordActivity({
        portfolioId: 'p1', actorId: 'u1', actorRole: 'manager',
        type: 'trade_executed', title: 'Trade', description: '',
      });

      const entries = manager.getUserActivity('u1');
      expect(entries).toHaveLength(1);
    });
  });
});

// ============================================================================
// Institutional Portfolio Manager
// ============================================================================

describe('InstitutionalPortfolioManager', () => {
  let manager: ReturnType<typeof createInstitutionalPortfolioManager>;

  beforeEach(() => {
    manager = createInstitutionalPortfolioManager();
  });

  describe('createFund', () => {
    it('should create an institutional fund', async () => {
      const fund = await manager.createFund(createValidFundInput('p1'), 'user_owner');
      expect(fund.id).toBeTruthy();
      expect(fund.name).toBe('Test Fund');
      expect(fund.status).toBe('setup');
      expect(fund.aum).toBe(0);
      expect(fund.highWaterMark).toBe(0);
    });

    it('should use default settings when not specified', async () => {
      const fund = await manager.createFund(
        { portfolioId: 'p1', name: 'Minimal Fund', fundType: 'index_fund' },
        'user_owner',
      );
      expect(fund.currency).toBe('USD');
      expect(fund.minimumInvestmentUsd).toBe(100000);
      expect(fund.managementFeePercent).toBe(2);
      expect(fund.performanceFeePercent).toBe(20);
    });

    it('should emit fund_created event', async () => {
      const events: unknown[] = [];
      manager.onEvent(event => events.push(event));

      await manager.createFund(createValidFundInput('p1'), 'user_owner');

      expect(events).toHaveLength(1);
      expect((events[0] as { type: string }).type).toBe('fund_created');
    });
  });

  describe('fund management', () => {
    it('should update fund AUM and high water mark', async () => {
      const fund = await manager.createFund(createValidFundInput('p1'), 'user_owner');
      const updated = await manager.updateFundAum(fund.id, 5000000);
      expect(updated.aum).toBe(5000000);
      expect(updated.highWaterMark).toBe(5000000);

      // AUM drops but high water mark stays
      const updated2 = await manager.updateFundAum(fund.id, 4000000);
      expect(updated2.aum).toBe(4000000);
      expect(updated2.highWaterMark).toBe(5000000);
    });

    it('should close a fund', async () => {
      const fund = await manager.createFund(createValidFundInput('p1'), 'user_owner');
      const closed = await manager.closeFund(fund.id, 'user_owner');
      expect(closed.status).toBe('closed');
    });

    it('should not close an already closed fund', async () => {
      const fund = await manager.createFund(createValidFundInput('p1'), 'user_owner');
      await manager.closeFund(fund.id, 'user_owner');

      await expect(manager.closeFund(fund.id, 'user_owner')).rejects.toThrow('already closed');
    });
  });

  describe('delegated managers', () => {
    it('should add a delegated manager', async () => {
      const fund = await manager.createFund(createValidFundInput('p1'), 'user_owner');
      const updated = await manager.addDelegatedManager(fund.id, {
        userId: 'user_manager',
        portfolioId: 'p1',
        permissions: [{ resource: 'trade', action: 'execute' }],
        delegatedBy: 'user_owner',
        managedAllocationPercent: 50,
      });

      expect(updated.delegatedManagers).toHaveLength(1);
      expect(updated.delegatedManagers[0].userId).toBe('user_manager');
      expect(updated.delegatedManagers[0].status).toBe('active');
    });

    it('should revoke delegation', async () => {
      const fund = await manager.createFund(createValidFundInput('p1'), 'user_owner');
      await manager.addDelegatedManager(fund.id, {
        userId: 'user_manager',
        portfolioId: 'p1',
        permissions: [],
        delegatedBy: 'user_owner',
      });

      const updated = await manager.revokeDelegation(fund.id, 'user_manager', 'user_owner');
      expect(updated.delegatedManagers[0].status).toBe('revoked');
    });

    it('should throw when revoking non-existent delegation', async () => {
      const fund = await manager.createFund(createValidFundInput('p1'), 'user_owner');
      await expect(
        manager.revokeDelegation(fund.id, 'unknown_user', 'user_owner'),
      ).rejects.toThrow('not a delegated manager');
    });
  });

  describe('reporting', () => {
    it('should generate institutional report', async () => {
      const fund = await manager.createFund(createValidFundInput('p1'), 'user_owner');
      await manager.updateFundAum(fund.id, 1000000);

      const performance = {
        totalValueUsd: 1100000,
        returnPercent: 10,
        returnUsd: 100000,
        sharpeRatio: 1.5,
        maxDrawdownPercent: 5,
        volatilityPercent: 15,
        winRate: 0.6,
        totalTrades: 20,
        profitableTrades: 12,
      };

      const riskMetrics = {
        overallRiskScore: 45,
        concentrationRisk: 50,
        liquidityRisk: 20,
        marketRisk: 40,
        topConcentrations: [],
        diversificationScore: 70,
      };

      const report = await manager.generateReport({
        fundId: fund.id,
        portfolioId: 'p1',
        reportType: 'monthly',
        period: { start: new Date(Date.now() - 30 * 86400000), end: new Date(), label: '30d' },
        generatedBy: 'user_owner',
        performance,
        riskMetrics,
        distributionList: ['user_owner', 'user_manager'],
      });

      expect(report.id).toBeTruthy();
      expect(report.reportType).toBe('monthly');
      expect(report.feesSummary.managementFeesUsd).toBeGreaterThan(0);
      expect(report.feesSummary.performanceFeesUsd).toBeGreaterThan(0);
      expect(report.distributionList).toHaveLength(2);
    });

    it('should list reports for a fund', async () => {
      const fund = await manager.createFund(createValidFundInput('p1'), 'user_owner');

      const baseReport = {
        fundId: fund.id,
        portfolioId: 'p1',
        reportType: 'monthly' as const,
        period: { start: new Date(Date.now() - 30 * 86400000), end: new Date(), label: '30d' as const },
        generatedBy: 'user_owner',
        performance: {
          totalValueUsd: 1000000, returnPercent: 5, returnUsd: 50000,
          sharpeRatio: 1, maxDrawdownPercent: 3, volatilityPercent: 10,
          winRate: 0.5, totalTrades: 10, profitableTrades: 5,
        },
        riskMetrics: {
          overallRiskScore: 30, concentrationRisk: 30, liquidityRisk: 20, marketRisk: 30,
          topConcentrations: [], diversificationScore: 80,
        },
      };

      await manager.generateReport(baseReport);
      await manager.generateReport(baseReport);

      const reports = manager.listReports(fund.id);
      expect(reports).toHaveLength(2);
    });
  });
});

// ============================================================================
// MultiUserPortfolioManager (unified facade)
// ============================================================================

describe('MultiUserPortfolioManager', () => {
  let manager: MultiUserPortfolioManager;

  beforeEach(() => {
    manager = createMultiUserPortfolioManager();
  });

  describe('initialization', () => {
    it('should initialize all sub-components', () => {
      expect(manager.sharedPortfolio).toBeDefined();
      expect(manager.permissions).toBeDefined();
      expect(manager.collaborativeStrategy).toBeDefined();
      expect(manager.teamAnalytics).toBeDefined();
      expect(manager.activityLog).toBeDefined();
      expect(manager.institutional).toBeDefined();
    });

    it('should accept custom config', () => {
      const customManager = createMultiUserPortfolioManager({
        defaultRequireApprovalForTrades: true,
        maxMembersPerPortfolio: 100,
      });
      expect(customManager).toBeDefined();
    });
  });

  describe('getHealth', () => {
    it('should return healthy status', () => {
      const health = manager.getHealth();
      expect(health.overall).toBe('healthy');
      expect(health.components.sharedPortfolio).toBe(true);
      expect(health.components.permissions).toBe(true);
      expect(health.components.collaborativeStrategy).toBe(true);
      expect(health.components.teamAnalytics).toBe(true);
      expect(health.components.activityLog).toBe(true);
      expect(health.components.institutional).toBe(true);
      expect(health.activePortfolios).toBe(0);
      expect(health.totalMembers).toBe(0);
    });

    it('should count active portfolios and members', async () => {
      await manager.sharedPortfolio.createPortfolio({
        name: 'P1', ownerId: 'owner1',
        initialMembers: [
          { userId: 'user2', role: 'manager' },
          { userId: 'user3', role: 'analyst' },
        ],
      });

      const health = manager.getHealth();
      expect(health.activePortfolios).toBe(1);
      expect(health.totalMembers).toBe(3); // owner + 2 initial members
    });
  });

  describe('event forwarding', () => {
    it('should forward events from all sub-components', async () => {
      const events: unknown[] = [];
      manager.onEvent(event => events.push(event));

      // Create portfolio (triggers portfolio event)
      const portfolio = await manager.sharedPortfolio.createPortfolio(createValidPortfolioInput());

      // Check permissions (triggers access denied event when non-member)
      manager.permissions.checkAccess(
        { portfolioId: portfolio.id, userId: 'unknown', resource: 'trade', action: 'execute' },
        [],
      );

      expect(events.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('end-to-end workflow', () => {
    it('should support full multi-user portfolio collaboration workflow', async () => {
      // 1. Owner creates portfolio
      const portfolio = await manager.sharedPortfolio.createPortfolio({
        name: 'Institutional Fund Alpha',
        ownerId: 'owner',
        metadata: { fundType: 'hedge_fund', riskTolerance: 'medium' },
        settings: { requireApprovalForTrades: true, allowAnalystProposals: true, notifyOnTrades: true, notifyOnStrategyChanges: true, reportingFrequency: 'monthly' },
      });

      // 2. Add team members
      await manager.sharedPortfolio.addMember({
        portfolioId: portfolio.id,
        userId: 'manager1',
        role: 'manager',
        invitedBy: 'owner',
      });

      await manager.sharedPortfolio.addMember({
        portfolioId: portfolio.id,
        userId: 'analyst1',
        role: 'analyst',
        invitedBy: 'owner',
      });

      await manager.sharedPortfolio.addMember({
        portfolioId: portfolio.id,
        userId: 'viewer1',
        role: 'viewer',
        invitedBy: 'owner',
      });

      // 3. Verify permissions
      const members = manager.sharedPortfolio.getMembers(portfolio.id);
      const analystAccess = manager.permissions.checkAccess(
        { portfolioId: portfolio.id, userId: 'analyst1', resource: 'strategy', action: 'propose' },
        members,
      );
      expect(analystAccess.allowed).toBe(true);

      const viewerTradeAccess = manager.permissions.checkAccess(
        { portfolioId: portfolio.id, userId: 'viewer1', resource: 'trade', action: 'execute' },
        members,
      );
      expect(viewerTradeAccess.allowed).toBe(false);

      // 4. Analyst proposes a strategy
      manager.collaborativeStrategy.setCurrentAllocations(portfolio.id, [
        { assetId: 'BTC', assetName: 'Bitcoin', currentPercent: 40, currentValueUsd: 400000 },
        { assetId: 'ETH', assetName: 'Ethereum', currentPercent: 60, currentValueUsd: 600000 },
      ]);

      const proposal = await manager.collaborativeStrategy.createProposal({
        portfolioId: portfolio.id,
        proposedBy: 'analyst1',
        title: 'Rebalance toward BTC',
        description: 'Increase BTC allocation for better risk-adjusted returns',
        proposedAllocations: [
          { assetId: 'BTC', assetName: 'Bitcoin', targetPercent: 60, currentPercent: 40 },
          { assetId: 'ETH', assetName: 'Ethereum', targetPercent: 40, currentPercent: 60 },
        ],
        rationale: 'BTC outperforming, lower volatility relative to ETH',
      });

      // 5. Submit and manager approves
      await manager.collaborativeStrategy.submitForReview(proposal.id, 'analyst1');
      const approved = await manager.collaborativeStrategy.approveProposal(proposal.id, 'manager1', 'Aligned with Q1 strategy');
      expect(approved.status).toBe('approved');

      // 6. Log trade activity
      await manager.activityLog.recordActivity({
        portfolioId: portfolio.id,
        actorId: 'manager1',
        actorRole: 'manager',
        type: 'trade_executed',
        title: 'Rebalanced BTC/ETH allocation',
        description: 'Executed rebalance per approved proposal',
        severity: 'info',
        metadata: { proposalId: proposal.id },
      });

      // 7. Create institutional fund
      const fund = await manager.institutional.createFund({
        portfolioId: portfolio.id,
        name: 'Fund Alpha Series A',
        fundType: 'hedge_fund',
        minimumInvestmentUsd: 500000,
      }, 'owner');

      await manager.institutional.updateFundAum(fund.id, 10000000);

      // 8. Verify overall health
      const health = manager.getHealth();
      expect(health.overall).toBe('healthy');
      expect(health.activePortfolios).toBe(1);
      expect(health.totalMembers).toBe(4); // owner + 3 added
    });
  });
});
