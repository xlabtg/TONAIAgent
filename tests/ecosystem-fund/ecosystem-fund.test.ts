/**
 * TONAIAgent - Ecosystem Fund Tests
 *
 * Comprehensive tests for the ecosystem fund and strategic capital allocation framework.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEcosystemFundManager,
  createTreasuryManager,
  createFundGovernanceManager,
  createGrantProgramManager,
  createInvestmentManager,
  createIncubationManager,
  createIntegrationIncentivesManager,
  createFlywheelManager,
  createAIEvaluationManager,
  DefaultEcosystemFundManager,
  DefaultTreasuryManager,
  DefaultFundGovernanceManager,
  DefaultGrantProgramManager,
  DefaultInvestmentManager,
  DefaultIncubationManager,
  DefaultIntegrationIncentivesManager,
  DefaultFlywheelManager,
  DefaultAIEvaluationManager,
} from '../../src/ecosystem-fund';

// ============================================================================
// Treasury Manager Tests
// ============================================================================

describe('TreasuryManager', () => {
  let treasury: DefaultTreasuryManager;

  beforeEach(() => {
    treasury = createTreasuryManager({
      multisigRequired: true,
      multisigThreshold: 2,
      maxSingleAllocation: '50000',
    });
  });

  describe('deposit', () => {
    it('should deposit funds to treasury', async () => {
      const tx = await treasury.deposit('100000', 'TON');

      expect(tx.type).toBe('deposit');
      expect(tx.amount).toBe('100000');
      expect(tx.status).toBe('confirmed');

      const balance = await treasury.getBalance();
      expect(balance).toBe('100000');
    });

    it('should update available balance after deposit', async () => {
      await treasury.deposit('100000', 'TON');

      const available = await treasury.getAvailableBalance();
      // Available = Total - Reserve (20%) - Allocated (0)
      expect(BigInt(available)).toBe(BigInt('80000'));
    });
  });

  describe('createAllocation', () => {
    beforeEach(async () => {
      await treasury.deposit('100000', 'TON');
    });

    it('should create an allocation', async () => {
      const allocation = await treasury.createAllocation({
        category: 'grant',
        recipientId: 'recipient-1',
        amount: '10000',
        purpose: 'Developer tools grant',
      });

      expect(allocation.id).toBeDefined();
      expect(allocation.category).toBe('grant');
      expect(allocation.amount).toBe('10000');
      expect(allocation.status).toBe('proposed');
    });

    it('should reject allocation exceeding maximum single allocation', async () => {
      await expect(
        treasury.createAllocation({
          category: 'grant',
          recipientId: 'recipient-1',
          amount: '500000',
          purpose: 'Test',
        })
      ).rejects.toThrow('DAO proposal required');
    });

    it('should require proposal for large allocations', async () => {
      await expect(
        treasury.createAllocation({
          category: 'investment',
          recipientId: 'recipient-1',
          amount: '60000', // Exceeds maxSingleAllocation
          purpose: 'Large investment',
        })
      ).rejects.toThrow('DAO proposal required');
    });
  });

  describe('approveAllocation', () => {
    beforeEach(async () => {
      await treasury.deposit('100000', 'TON');
    });

    it('should approve allocation with enough signers', async () => {
      const allocation = await treasury.createAllocation({
        category: 'grant',
        recipientId: 'recipient-1',
        amount: '10000',
        purpose: 'Test grant',
      });

      // First approval
      await treasury.approveAllocation(allocation.id, 'signer-1');
      let updated = await treasury.getallocation(allocation.id);
      expect(updated.status).toBe('under_review');

      // Second approval (meets threshold)
      await treasury.approveAllocation(allocation.id, 'signer-2');
      updated = await treasury.getallocation(allocation.id);
      expect(updated.status).toBe('approved');
    });
  });

  describe('getStats', () => {
    it('should return treasury statistics', async () => {
      await treasury.deposit('100000', 'TON');

      const stats = await treasury.getStats();

      expect(stats.totalDeposited).toBe('100000');
      expect(stats.activeAllocations).toBe(0);
    });
  });
});

// ============================================================================
// Fund Governance Tests
// ============================================================================

describe('FundGovernanceManager', () => {
  let governance: DefaultFundGovernanceManager;

  beforeEach(() => {
    governance = createFundGovernanceManager({
      votingPeriod: 7,
      quorumPercent: 10,
      supermajorityPercent: 67,
      proposalThreshold: '1000',
    });

    // Set up voting power for test accounts
    governance.setVotingPower('proposer-1', '10000');
    governance.setVotingPower('voter-1', '5000');
    governance.setVotingPower('voter-2', '3000');
  });

  describe('createProposal', () => {
    it('should create a governance proposal', async () => {
      const proposal = await governance.createProposal(
        {
          type: 'grant_allocation',
          title: 'Fund Developer Tools',
          description: 'Allocate funds for developer tools',
          category: 'grant',
          amount: '50000',
        },
        'proposer-1'
      );

      expect(proposal.id).toBeDefined();
      expect(proposal.title).toBe('Fund Developer Tools');
      expect(proposal.status).toBe('pending');
    });

    it('should reject proposal from low voting power', async () => {
      governance.setVotingPower('low-power', '100');

      await expect(
        governance.createProposal(
          {
            type: 'grant_allocation',
            title: 'Test',
            description: 'Test',
            category: 'grant',
            amount: '1000',
          },
          'low-power'
        )
      ).rejects.toThrow('Insufficient voting power');
    });
  });

  describe('vote', () => {
    it('should cast a vote on proposal', async () => {
      const proposal = await governance.createProposal(
        {
          type: 'grant_allocation',
          title: 'Test Proposal',
          description: 'Test',
          category: 'grant',
          amount: '10000',
        },
        'proposer-1'
      );

      // Set voting dates to allow immediate voting (for testing)
      const now = new Date();
      const pastDate = new Date(now.getTime() - 60000); // 1 minute ago
      const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      governance.setProposalVotingDates(proposal.id, pastDate, futureDate);

      // Manually activate for testing
      await governance.activateProposal(proposal.id);

      const vote = await governance.vote({
        proposalId: proposal.id,
        voter: 'voter-1',
        support: true,
        reason: 'Good proposal',
      });

      expect(vote.voter).toBe('voter-1');
      expect(vote.support).toBe(true);
      expect(vote.votingPower).toBe('5000');
    });

    it('should prevent double voting', async () => {
      const proposal = await governance.createProposal(
        {
          type: 'grant_allocation',
          title: 'Test',
          description: 'Test',
          category: 'grant',
          amount: '10000',
        },
        'proposer-1'
      );

      // Set voting dates to allow immediate voting (for testing)
      const now = new Date();
      const pastDate = new Date(now.getTime() - 60000); // 1 minute ago
      const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      governance.setProposalVotingDates(proposal.id, pastDate, futureDate);

      await governance.activateProposal(proposal.id);
      await governance.vote({
        proposalId: proposal.id,
        voter: 'voter-1',
        support: true,
      });

      await expect(
        governance.vote({
          proposalId: proposal.id,
          voter: 'voter-1',
          support: false,
        })
      ).rejects.toThrow('Already voted');
    });
  });

  describe('committees', () => {
    it('should create a committee', async () => {
      const committee = await governance.createCommittee('Grant Review', 'grant_review', {
        maxDecisionAmount: '10000',
        canApproveGrants: true,
        canApproveInvestments: false,
        canModifyPrograms: false,
        requiresDAOApproval: '20000',
      });

      expect(committee.id).toBeDefined();
      expect(committee.name).toBe('Grant Review');
      expect(committee.type).toBe('grant_review');
    });

    it('should add members to committee', async () => {
      const committee = await governance.createCommittee('Test', 'technical', {
        maxDecisionAmount: '5000',
        canApproveGrants: false,
        canApproveInvestments: false,
        canModifyPrograms: false,
        requiresDAOApproval: '10000',
      });

      const member = await governance.addCommitteeMember(committee.id, {
        userId: 'user-1',
        name: 'Alice',
        role: 'chair',
        votingPower: 2,
      });

      expect(member.id).toBeDefined();
      expect(member.role).toBe('chair');

      const updated = await governance.getCommittee(committee.id);
      expect(updated.members).toHaveLength(1);
    });
  });
});

// ============================================================================
// Grant Program Tests
// ============================================================================

describe('GrantProgramManager', () => {
  let grants: DefaultGrantProgramManager;

  beforeEach(() => {
    grants = createGrantProgramManager({
      enabled: true,
      maxGrantAmount: '100000',
      reviewPeriod: 14,
    });
  });

  describe('categories', () => {
    it('should have default categories', async () => {
      const categories = await grants.getCategories();
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should create a new category', async () => {
      const category = await grants.createCategory({
        name: 'AI Research',
        description: 'AI and ML research grants',
        budget: '200000',
        minAmount: '5000',
        maxAmount: '50000',
        priorities: ['LLM integration', 'ML models'],
        requirements: ['Research proposal'],
        active: true,
      });

      expect(category.id).toBeDefined();
      expect(category.name).toBe('AI Research');
    });
  });

  describe('applications', () => {
    it('should submit a grant application', async () => {
      const categories = await grants.getCategories();
      const applicant = {
        id: 'applicant-1',
        name: 'Developer Dave',
        type: 'individual' as const,
        description: 'Experienced developer',
        walletAddress: 'EQC...',
        previousGrants: [],
        reputation: 50,
      };

      const application = await grants.submitApplication(
        {
          categoryId: categories[0].id,
          title: 'SDK Improvement',
          description: 'Improve the TypeScript SDK',
          problemStatement: 'Current SDK lacks features',
          proposedSolution: 'Add new modules',
          requestedAmount: '10000',
          milestones: [
            {
              id: 'm1',
              title: 'Phase 1',
              description: 'Initial development',
              deliverables: ['Code'],
              amount: '5000',
              duration: 4,
            },
            {
              id: 'm2',
              title: 'Phase 2',
              description: 'Testing',
              deliverables: ['Tests'],
              amount: '5000',
              duration: 2,
            },
          ],
          team: [{ name: 'Dave', role: 'Lead', experience: '5 years', commitment: 'full-time' }],
          budget: {
            development: '8000',
            design: '0',
            marketing: '500',
            operations: '500',
            other: '1000',
            total: '10000',
            justification: 'Standard development costs',
          },
          timeline: '6 weeks',
          expectedOutcomes: ['Better SDK'],
          metrics: [{ name: 'Downloads', description: 'SDK downloads', target: 1000, unit: 'downloads', weight: 1 }],
        },
        applicant
      );

      expect(application.id).toBeDefined();
      expect(application.status).toBe('submitted');
      expect(application.requestedAmount).toBe('10000');
    });

    it('should reject application below minimum amount', async () => {
      const categories = await grants.getCategories();
      const applicant = {
        id: 'applicant-1',
        name: 'Test',
        type: 'individual' as const,
        description: 'Test',
        walletAddress: 'EQC...',
        previousGrants: [],
        reputation: 50,
      };

      await expect(
        grants.submitApplication(
          {
            categoryId: categories[0].id,
            title: 'Test',
            description: 'Test',
            problemStatement: 'Test',
            proposedSolution: 'Test',
            requestedAmount: '100', // Below minimum
            milestones: [],
            team: [],
            budget: {
              development: '100',
              design: '0',
              marketing: '0',
              operations: '0',
              other: '0',
              total: '100',
              justification: '',
            },
            timeline: '1 week',
            expectedOutcomes: [],
            metrics: [],
          },
          applicant
        )
      ).rejects.toThrow('below minimum');
    });
  });

  describe('grant lifecycle', () => {
    it('should create grant from approved application', async () => {
      const categories = await grants.getCategories();
      const applicant = {
        id: 'applicant-1',
        name: 'Test',
        type: 'individual' as const,
        description: 'Test',
        walletAddress: 'EQC...',
        previousGrants: [],
        reputation: 50,
      };

      const application = await grants.submitApplication(
        {
          categoryId: categories[0].id,
          title: 'Test Grant',
          description: 'Test',
          problemStatement: 'Test',
          proposedSolution: 'Test',
          requestedAmount: '5000',
          milestones: [
            { id: 'm1', title: 'M1', description: 'D1', deliverables: [], amount: '5000', duration: 4 },
          ],
          team: [],
          budget: {
            development: '5000',
            design: '0',
            marketing: '0',
            operations: '0',
            other: '0',
            total: '5000',
            justification: '',
          },
          timeline: '4 weeks',
          expectedOutcomes: [],
          metrics: [],
        },
        applicant
      );

      // Approve application
      await grants.updateApplicationStatus(application.id, 'approved');

      // Create grant
      const grant = await grants.createGrant(application.id);

      expect(grant.id).toBeDefined();
      expect(grant.status).toBe('active');
      expect(grant.totalAmount).toBe('5000');
    });
  });

  describe('getStats', () => {
    it('should return grant program statistics', async () => {
      const stats = await grants.getStats();

      expect(stats.totalCategories).toBeGreaterThan(0);
      expect(stats.activeCategories).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Investment Manager Tests
// ============================================================================

describe('InvestmentManager', () => {
  let investments: DefaultInvestmentManager;

  beforeEach(() => {
    investments = createInvestmentManager({
      enabled: true,
      maxInvestmentSize: '500000',
      minInvestmentSize: '10000',
      maxPortfolioConcentration: 25,
      riskTolerance: 'moderate',
    });
  });

  describe('opportunities', () => {
    it('should create an investment opportunity', async () => {
      const opportunity = await investments.createOpportunity({
        name: 'DeFi Protocol',
        type: 'token',
        sector: 'DeFi',
        stage: 'seed',
        description: 'Innovative DeFi protocol',
        targetRaise: '1000000',
        minInvestment: '50000',
        maxInvestment: '200000',
        terms: {
          instrumentType: 'token',
          amount: '100000',
          tokenAllocation: '1000000',
          pricePerToken: '0.1',
        },
        team: [{ name: 'Alice', role: 'CEO', experience: '10 years', commitment: 'full-time' }],
        metrics: {
          tvl: '5000000',
          users: 10000,
          transactions: 100000,
        },
      });

      expect(opportunity.id).toBeDefined();
      expect(opportunity.status).toBe('sourced');
      expect(opportunity.sector).toBe('DeFi');
    });
  });

  describe('due diligence', () => {
    it('should start due diligence process', async () => {
      const opportunity = await investments.createOpportunity({
        name: 'Test Project',
        type: 'equity',
        sector: 'Infrastructure',
        stage: 'seed',
        description: 'Test',
        targetRaise: '500000',
        minInvestment: '25000',
        maxInvestment: '100000',
        terms: { instrumentType: 'equity', amount: '50000', ownership: 5 },
        team: [],
        metrics: {},
      });

      const report = await investments.startDueDiligence(opportunity.id);

      expect(report.id).toBeDefined();
      expect(report.status).toBe('in_progress');
      expect(report.sections.length).toBeGreaterThan(0);
    });
  });

  describe('investments', () => {
    it('should make an investment', async () => {
      const opportunity = await investments.createOpportunity({
        name: 'AI Startup',
        type: 'equity',
        sector: 'AI',
        stage: 'seed',
        description: 'AI platform',
        targetRaise: '2000000',
        minInvestment: '50000',
        maxInvestment: '500000',
        terms: { instrumentType: 'equity', amount: '100000', ownership: 5 },
        team: [],
        metrics: {},
      });

      const investment = await investments.makeInvestment(opportunity.id, '100000', {
        instrumentType: 'equity',
        amount: '100000',
        ownership: 5,
      });

      expect(investment.id).toBeDefined();
      expect(investment.investedAmount).toBe('100000');
      expect(investment.status).toBe('active');
    });

    it('should reject investment below minimum', async () => {
      const opportunity = await investments.createOpportunity({
        name: 'Test',
        type: 'equity',
        sector: 'DeFi',
        stage: 'seed',
        description: 'Test',
        targetRaise: '1000000',
        minInvestment: '20000',
        maxInvestment: '200000',
        terms: { instrumentType: 'equity', amount: '5000' },
        team: [],
        metrics: {},
      });

      await expect(
        investments.makeInvestment(opportunity.id, '5000', {
          instrumentType: 'equity',
          amount: '5000',
        })
      ).rejects.toThrow('below minimum');
    });
  });

  describe('portfolio', () => {
    it('should get portfolio summary', async () => {
      const summary = await investments.getPortfolioSummary();

      expect(summary.totalInvested).toBeDefined();
      expect(summary.investmentCount).toBe(0);
    });
  });
});

// ============================================================================
// Incubation Manager Tests
// ============================================================================

describe('IncubationManager', () => {
  let incubation: DefaultIncubationManager;

  beforeEach(() => {
    incubation = createIncubationManager({
      enabled: true,
      programDuration: 3,
      cohortSize: 10,
      stipend: '5000',
    });
  });

  describe('programs', () => {
    it('should create an incubation program', async () => {
      const program = await incubation.createProgram({
        name: 'TON Builders',
        description: 'Accelerator for TON projects',
        cohort: '2026-Q1',
        status: 'upcoming',
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-06-01'),
        applicationDeadline: new Date('2026-02-15'),
        tracks: [],
        mentors: [],
        partners: [],
        events: [],
        resources: [],
      });

      expect(program.id).toBeDefined();
      expect(program.name).toBe('TON Builders');
      expect(program.status).toBe('upcoming');
    });
  });

  describe('tracks', () => {
    it('should add a track to program', async () => {
      const program = await incubation.createProgram({
        name: 'Test Program',
        description: 'Test',
        cohort: '2026-Q1',
        status: 'upcoming',
        startDate: new Date(),
        endDate: new Date(),
        applicationDeadline: new Date(),
        tracks: [],
        mentors: [],
        partners: [],
        events: [],
        resources: [],
      });

      const track = await incubation.addTrack(program.id, {
        name: 'DeFi Track',
        focus: 'DeFi protocols',
        description: 'Build DeFi on TON',
        curriculum: [
          { week: 1, title: 'Intro', description: 'Introduction', topics: ['TON basics'] },
        ],
        mentors: [],
        maxParticipants: 5,
      });

      expect(track.id).toBeDefined();
      expect(track.name).toBe('DeFi Track');
    });
  });

  describe('applications', () => {
    it('should submit an incubation application', async () => {
      const program = await incubation.createProgram({
        name: 'Test Program',
        description: 'Test',
        cohort: '2026-Q1',
        status: 'applications_open',
        startDate: new Date(),
        endDate: new Date(),
        applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        tracks: [],
        mentors: [],
        partners: [],
        events: [],
        resources: [],
      });

      const track = await incubation.addTrack(program.id, {
        name: 'Test Track',
        focus: 'Testing',
        description: 'Test',
        curriculum: [{ week: 1, title: 'W1', description: 'D1', topics: [] }],
        mentors: [],
        maxParticipants: 10,
      });

      const applicant = {
        id: 'applicant-1',
        name: 'Startup Team',
        type: 'team' as const,
        description: 'Building cool stuff',
        walletAddress: 'EQC...',
        previousGrants: [],
        reputation: 50,
      };

      const application = await incubation.submitApplication(
        {
          programId: program.id,
          trackId: track.id,
          team: [{ name: 'Alice', role: 'CEO', experience: '5 years', commitment: 'full-time' }],
          project: {
            name: 'Test Project',
            tagline: 'Building the future',
            description: 'Amazing project',
            stage: 'prototype',
            techStack: ['TypeScript', 'TON'],
            uniqueValue: 'Very unique',
          },
          vision: 'To be the best',
          traction: '1000 users',
          askFromProgram: 'Mentorship and funding',
          coachability: 'Very coachable',
        },
        applicant
      );

      expect(application.id).toBeDefined();
      expect(application.status).toBe('submitted');
    });
  });

  describe('participant lifecycle', () => {
    it('should accept application and create participant', async () => {
      const program = await incubation.createProgram({
        name: 'Test',
        description: 'Test',
        cohort: '2026-Q1',
        status: 'applications_open',
        startDate: new Date(),
        endDate: new Date(),
        applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        tracks: [],
        mentors: [],
        partners: [],
        events: [],
        resources: [],
      });

      const track = await incubation.addTrack(program.id, {
        name: 'Track',
        focus: 'Focus',
        description: 'Desc',
        curriculum: [{ week: 1, title: 'W1', description: 'D1', topics: [] }],
        mentors: [],
        maxParticipants: 10,
      });

      const applicant = {
        id: 'applicant-1',
        name: 'Test',
        type: 'team' as const,
        description: 'Test',
        walletAddress: 'EQC...',
        previousGrants: [],
        reputation: 50,
      };

      const application = await incubation.submitApplication(
        {
          programId: program.id,
          trackId: track.id,
          team: [],
          project: {
            name: 'Project',
            tagline: 'Tag',
            description: 'Desc',
            stage: 'idea',
            techStack: [],
            uniqueValue: 'Unique',
          },
          vision: 'Vision',
          askFromProgram: 'Help',
          coachability: 'High',
        },
        applicant
      );

      const participant = await incubation.acceptApplication(application.id);

      expect(participant.id).toBeDefined();
      expect(participant.status).toBe('onboarding');
    });
  });
});

// ============================================================================
// Integration Incentives Tests
// ============================================================================

describe('IntegrationIncentivesManager', () => {
  let incentives: DefaultIntegrationIncentivesManager;

  beforeEach(() => {
    incentives = createIntegrationIncentivesManager({
      enabled: true,
      maxIncentivePerProject: '50000',
      verificationRequired: true,
    });
  });

  describe('categories', () => {
    it('should have default incentive categories', async () => {
      const categories = await incentives.getCategories();
      expect(categories.length).toBeGreaterThan(0);
    });
  });

  describe('applications', () => {
    it('should submit an incentive application', async () => {
      const categories = await incentives.getCategories();
      const applicant = {
        id: 'dev-1',
        name: 'Developer',
        type: 'individual' as const,
        description: 'Plugin developer',
        walletAddress: 'EQC...',
        previousGrants: [],
        reputation: 50,
      };

      const application = await incentives.submitApplication(
        {
          categoryId: categories[0].id,
          projectName: 'TON Wallet Plugin',
          description: 'Wallet integration plugin',
          integrationDetails: {
            type: 'plugin_development',
            technicalSpec: 'Full API integration',
            repository: 'https://github.com/test/plugin',
            mainnet: false,
            testnet: true,
          },
          expectedImpact: '10000 users',
          requestedAmount: '15000',
          timeline: '8 weeks',
        },
        applicant
      );

      expect(application.id).toBeDefined();
      expect(application.status).toBe('submitted');
    });
  });

  describe('awards', () => {
    it('should create award from approved application', async () => {
      const categories = await incentives.getCategories();
      const applicant = {
        id: 'dev-1',
        name: 'Developer',
        type: 'individual' as const,
        description: 'Dev',
        walletAddress: 'EQC...',
        previousGrants: [],
        reputation: 50,
      };

      const application = await incentives.submitApplication(
        {
          categoryId: categories[0].id,
          projectName: 'Test Plugin',
          description: 'Test',
          integrationDetails: {
            type: 'plugin_development',
            technicalSpec: 'Spec',
          },
          expectedImpact: 'Impact',
          requestedAmount: '10000',
          timeline: '4 weeks',
        },
        applicant
      );

      await incentives.updateApplicationStatus(application.id, 'approved');
      const award = await incentives.createAward(application.id);

      expect(award.id).toBeDefined();
      expect(award.status).toBe('active');
      expect(award.schedule.length).toBeGreaterThan(0);
    });
  });

  describe('getStats', () => {
    it('should return incentive statistics', async () => {
      const stats = await incentives.getStats();

      expect(stats.totalCategories).toBeGreaterThan(0);
      expect(stats.activeCategories).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Flywheel Manager Tests
// ============================================================================

describe('FlywheelManager', () => {
  let flywheel: DefaultFlywheelManager;

  beforeEach(() => {
    flywheel = createFlywheelManager({
      enabled: true,
      dashboardEnabled: true,
      alertsEnabled: true,
    });
  });

  describe('metrics', () => {
    it('should collect flywheel metrics', async () => {
      const metrics = await flywheel.collectMetrics();

      expect(metrics.timestamp).toBeDefined();
      expect(metrics.capital).toBeDefined();
      expect(metrics.innovation).toBeDefined();
      expect(metrics.users).toBeDefined();
      expect(metrics.data).toBeDefined();
      expect(metrics.agents).toBeDefined();
      expect(metrics.flywheel).toBeDefined();
    });

    it('should calculate flywheel score', async () => {
      const score = await flywheel.calculateFlywheelScore();

      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
      expect(score.momentum).toBeDefined();
    });
  });

  describe('alerts', () => {
    it('should check for alerts', async () => {
      const alerts = await flywheel.checkAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('reports', () => {
    it('should generate flywheel report', async () => {
      // Collect some metrics first
      await flywheel.collectMetrics();

      const report = await flywheel.generateReport('2026-02');

      expect(report.id).toBeDefined();
      expect(report.period).toBe('2026-02');
      expect(report.metrics).toBeDefined();
      expect(report.highlights).toBeDefined();
    });
  });

  describe('trends', () => {
    it('should get trend data', async () => {
      // Collect some metrics
      await flywheel.collectMetrics();

      const trends = await flywheel.getTrends('30d');

      expect(trends.capitalTrend).toBeDefined();
      expect(trends.innovationTrend).toBeDefined();
      expect(trends.usersTrend).toBeDefined();
    });
  });
});

// ============================================================================
// AI Evaluation Manager Tests
// ============================================================================

describe('AIEvaluationManager', () => {
  let ai: DefaultAIEvaluationManager;

  beforeEach(() => {
    ai = createAIEvaluationManager({
      enabled: true,
      provider: 'groq',
      modelId: 'llama-3.3-70b-versatile',
    });
  });

  describe('evaluation', () => {
    it('should evaluate a grant application', async () => {
      const result = await ai.evaluate({
        type: 'grant',
        applicationId: 'app-1',
        applicationData: {
          title: 'SDK Improvement',
          description: 'Improve TypeScript SDK',
          requestedAmount: '10000',
          team: [{ name: 'Alice', role: 'Lead' }],
        },
      });

      expect(result.id).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.recommendation).toBeDefined();
      expect(result.criteriaScores.length).toBeGreaterThan(0);
      expect(result.strengths).toBeDefined();
      expect(result.weaknesses).toBeDefined();
    });

    it('should evaluate an investment opportunity', async () => {
      const result = await ai.evaluate({
        type: 'investment',
        applicationId: 'inv-1',
        applicationData: {
          name: 'DeFi Protocol',
          sector: 'DeFi',
          stage: 'seed',
          valuation: '10000000',
          team: [{ name: 'Bob', role: 'CEO' }],
        },
      });

      expect(result.type).toBe('investment');
      expect(result.criteriaScores.length).toBeGreaterThan(0);
    });
  });

  describe('criteria', () => {
    it('should get evaluation criteria by type', () => {
      const grantCriteria = ai.getCriteria('grant');
      expect(grantCriteria.length).toBeGreaterThan(0);

      const investmentCriteria = ai.getCriteria('investment');
      expect(investmentCriteria.length).toBeGreaterThan(0);
    });
  });

  describe('batch evaluation', () => {
    it('should evaluate multiple applications', async () => {
      const results = await ai.evaluateBatch([
        { type: 'grant', applicationId: 'app-1', applicationData: { title: 'Grant 1' } },
        { type: 'grant', applicationId: 'app-2', applicationData: { title: 'Grant 2' } },
      ]);

      expect(results.length).toBe(2);
    });
  });
});

// ============================================================================
// Ecosystem Fund Manager Integration Tests
// ============================================================================

describe('EcosystemFundManager', () => {
  let fund: DefaultEcosystemFundManager;

  beforeEach(() => {
    fund = createEcosystemFundManager({
      treasury: { multisigThreshold: 2 },
      governance: { votingPeriod: 7 },
      grants: { enabled: true },
      investments: { enabled: true },
      incubation: { enabled: true },
      incentives: { enabled: true },
      flywheel: { enabled: true },
      aiEvaluation: { enabled: true },
    });
  });

  describe('initialization', () => {
    it('should initialize all components', () => {
      expect(fund.treasury).toBeDefined();
      expect(fund.governance).toBeDefined();
      expect(fund.grants).toBeDefined();
      expect(fund.investments).toBeDefined();
      expect(fund.incubation).toBeDefined();
      expect(fund.incentives).toBeDefined();
      expect(fund.flywheel).toBeDefined();
      expect(fund.aiEvaluation).toBeDefined();
    });
  });

  describe('health check', () => {
    it('should return health status', async () => {
      const health = await fund.getHealth();

      expect(health.overall).toBe('healthy');
      expect(health.components.treasury).toBe(true);
      expect(health.components.governance).toBe(true);
      expect(health.components.grants).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should return fund statistics', async () => {
      const stats = await fund.getStats();

      expect(stats.treasuryBalance).toBeDefined();
      expect(stats.totalAllocated).toBeDefined();
      expect(stats.activeGrants).toBeDefined();
    });
  });

  describe('event forwarding', () => {
    it('should forward events from components', async () => {
      const events: string[] = [];

      fund.onEvent((event) => {
        events.push(event.type);
      });

      // Trigger an event by collecting metrics
      await fund.flywheel.collectMetrics();

      expect(events).toContain('metrics_updated');
    });
  });
});
