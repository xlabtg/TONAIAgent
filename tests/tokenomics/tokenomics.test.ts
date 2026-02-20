/**
 * TONAIAgent - Tokenomics Tests
 *
 * Comprehensive tests for the tokenomics and agent economy layer.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTokenomicsManager,
  createTokenUtility,
  createStakingModule,
  createRewardsDistributor,
  createGovernanceEngine,
  createReputationSystem,
  createAntiExploitManager,
  DefaultTokenomicsManager,
  DefaultTokenUtility,
  DefaultStakingModule,
  DefaultRewardsDistributor,
  DefaultGovernanceEngine,
  DefaultReputationSystem,
  DefaultAntiExploitManager,
} from '../../src/tokenomics';

// ============================================================================
// Token Utility Tests
// ============================================================================

describe('TokenUtility', () => {
  let tokenUtility: DefaultTokenUtility;

  beforeEach(() => {
    tokenUtility = createTokenUtility({
      symbol: 'TONAI',
      decimals: 9,
    });
  });

  describe('getTier', () => {
    it('should return bronze for minimum stake', () => {
      const tier = tokenUtility.getTier('100');
      expect(tier).toBe('bronze');
    });

    it('should return silver for 1000+ stake', () => {
      const tier = tokenUtility.getTier('1000');
      expect(tier).toBe('silver');
    });

    it('should return gold for 10000+ stake', () => {
      const tier = tokenUtility.getTier('10000');
      expect(tier).toBe('gold');
    });

    it('should return platinum for 100000+ stake', () => {
      const tier = tokenUtility.getTier('100000');
      expect(tier).toBe('platinum');
    });

    it('should return diamond for 1000000+ stake', () => {
      const tier = tokenUtility.getTier('1000000');
      expect(tier).toBe('diamond');
    });
  });

  describe('calculateFeeDiscount', () => {
    it('should calculate fee discount based on tier', () => {
      const result = tokenUtility.calculateFeeDiscount({
        stakedAmount: '10000',
      });

      expect(result.tier).toBe('gold');
      expect(result.discountPercent).toBeGreaterThan(0);
    });

    it('should include duration bonus for long-term staking', () => {
      const withoutDuration = tokenUtility.calculateFeeDiscount({
        stakedAmount: '10000',
      });

      const withDuration = tokenUtility.calculateFeeDiscount({
        stakedAmount: '10000',
        stakeDuration: 365,
      });

      expect(withDuration.discountPercent).toBeGreaterThan(withoutDuration.discountPercent);
    });

    it('should calculate amount to next tier', () => {
      const result = tokenUtility.calculateFeeDiscount({
        stakedAmount: '5000',
      });

      expect(result.tier).toBe('silver');
      expect(result.nextTier).toBe('gold');
      expect(result.amountToNextTier).toBeDefined();
    });
  });

  describe('calculateVotingPower', () => {
    it('should calculate base voting power', () => {
      const result = tokenUtility.calculateVotingPower({
        stakedAmount: '10000',
        stakeDuration: 0,
        reputationScore: 0, // No reputation bonus
      });

      expect(result.votingPower).toBe('10000');
      expect(result.multiplier).toBe(1);
    });

    it('should include lock bonus for longer duration', () => {
      const result = tokenUtility.calculateVotingPower({
        stakedAmount: '10000',
        stakeDuration: 365,
      });

      expect(BigInt(result.votingPower)).toBeGreaterThan(BigInt('10000'));
      expect(result.multiplier).toBeGreaterThan(1);
    });

    it('should include delegated power', () => {
      const result = tokenUtility.calculateVotingPower({
        stakedAmount: '10000',
        stakeDuration: 0,
        delegatedAmount: '5000',
      });

      expect(BigInt(result.delegatedPower)).toBe(BigInt('5000'));
      expect(BigInt(result.votingPower)).toBeGreaterThan(BigInt('10000'));
    });
  });

  describe('formatAmount', () => {
    it('should format amount with symbol', () => {
      const formatted = tokenUtility.formatAmount('1000000000', true);
      expect(formatted).toContain('TONAI');
    });

    it('should format amount without symbol', () => {
      const formatted = tokenUtility.formatAmount('1000000000', false);
      expect(formatted).not.toContain('TONAI');
    });
  });
});

// ============================================================================
// Staking Module Tests
// ============================================================================

describe('StakingModule', () => {
  let staking: DefaultStakingModule;

  beforeEach(() => {
    staking = createStakingModule({
      enabled: true,
      minStakeAmount: '100',
      lockPeriods: [7, 30, 90, 365],
      rewardRates: [0.05, 0.08, 0.12, 0.20],
    });
  });

  describe('stake', () => {
    it('should create a stake position', async () => {
      const stake = await staking.stake({
        userId: 'user-1',
        amount: '1000',
        lockPeriod: 30,
      });

      expect(stake.id).toBeDefined();
      expect(stake.userId).toBe('user-1');
      expect(stake.amount).toBe('1000');
      expect(stake.lockPeriod).toBe(30);
      expect(stake.status).toBe('active');
    });

    it('should reject stake below minimum', async () => {
      await expect(
        staking.stake({
          userId: 'user-1',
          amount: '50',
          lockPeriod: 30,
        })
      ).rejects.toThrow();
    });

    it('should reject invalid lock period', async () => {
      await expect(
        staking.stake({
          userId: 'user-1',
          amount: '1000',
          lockPeriod: 15,
        })
      ).rejects.toThrow();
    });
  });

  describe('getPosition', () => {
    it('should return staking position for user', async () => {
      await staking.stake({
        userId: 'user-1',
        amount: '1000',
        lockPeriod: 30,
      });

      const position = await staking.getPosition('user-1');

      expect(position.userId).toBe('user-1');
      expect(position.totalStaked).toBe('1000');
      expect(position.stakes.length).toBe(1);
    });

    it('should return empty position for unknown user', async () => {
      const position = await staking.getPosition('unknown');

      expect(position.totalStaked).toBe('0');
      expect(position.stakes.length).toBe(0);
    });
  });

  describe('unstake', () => {
    it('should allow unstake after lock period', async () => {
      const stake = await staking.stake({
        userId: 'user-1',
        amount: '1000',
        lockPeriod: 7,
      });

      // Manually set unlock date to past for testing
      const stakeObj = await staking.getStake(stake.id);
      if (stakeObj) {
        stakeObj.unlockDate = new Date(Date.now() - 1000);
      }

      const result = await staking.unstake({
        userId: 'user-1',
        stakeId: stake.id,
      });

      expect(result.success).toBe(true);
      expect(result.penaltyAmount).toBe('0');
    });
  });

  describe('getRewardRate', () => {
    it('should return correct reward rate for lock period', () => {
      expect(staking.getRewardRate(7)).toBe(0.05);
      expect(staking.getRewardRate(30)).toBe(0.08);
      expect(staking.getRewardRate(90)).toBe(0.12);
      expect(staking.getRewardRate(365)).toBe(0.20);
    });
  });

  describe('calculateRewards', () => {
    it('should calculate expected rewards', () => {
      const rewards = staking.calculateRewards({
        amount: '10000',
        lockPeriod: 365,
        duration: 30,
      });

      expect(BigInt(rewards.baseReward)).toBeGreaterThan(BigInt(0));
      expect(rewards.currentApy).toBe(20);
    });
  });
});

// ============================================================================
// Rewards Distributor Tests
// ============================================================================

describe('RewardsDistributor', () => {
  let rewards: DefaultRewardsDistributor;

  beforeEach(() => {
    rewards = createRewardsDistributor({
      distributionSchedule: 'daily',
      feeDistribution: {
        creators: 0.40,
        stakers: 0.30,
        treasury: 0.20,
        liquidity: 0.10,
      },
    });
  });

  describe('calculatePerformanceFees', () => {
    it('should calculate fees correctly', () => {
      const result = rewards.calculatePerformanceFees({
        strategyId: 'strategy-1',
        profitAmount: '1000',
        previousHighWaterMark: '10000',
        currentValue: '11000',
      });

      expect(BigInt(result.eligibleProfit)).toBe(BigInt('1000'));
      expect(BigInt(result.creatorFee)).toBeGreaterThan(BigInt(0));
      expect(BigInt(result.platformFee)).toBeGreaterThan(BigInt(0));
      expect(result.newHighWaterMark).toBe('11000');
    });

    it('should not charge fees below high water mark', () => {
      const result = rewards.calculatePerformanceFees({
        strategyId: 'strategy-1',
        profitAmount: '0',
        previousHighWaterMark: '10000',
        currentValue: '9000',
      });

      expect(result.eligibleProfit).toBe('0');
      expect(result.creatorFee).toBe('0');
    });
  });

  describe('distributeRewards', () => {
    it('should distribute rewards by category', async () => {
      const result = await rewards.distributeRewards('2026-02');

      expect(result.success).toBe(true);
      expect(result.byCategory).toBeDefined();
      expect(BigInt(result.byCategory.creators)).toBeGreaterThanOrEqual(BigInt(0));
    });
  });

  describe('vesting', () => {
    it('should create vesting schedule', async () => {
      const schedule = await rewards.createVestingSchedule({
        userId: 'user-1',
        totalAmount: '10000',
        cliff: 30,
        duration: 365,
        immediateRelease: 0.25,
      });

      expect(schedule.id).toBeDefined();
      expect(schedule.totalAmount).toBe('10000');
      expect(schedule.status).toBe('active');
    });

    it('should track vested amount', async () => {
      await rewards.createVestingSchedule({
        userId: 'user-1',
        totalAmount: '10000',
        immediateRelease: 0.25,
      });

      const status = await rewards.getVestedAmount('user-1');

      expect(BigInt(status.totalAllocated)).toBe(BigInt('10000'));
      expect(BigInt(status.vestedAmount)).toBeGreaterThan(BigInt(0));
    });
  });
});

// ============================================================================
// Governance Engine Tests
// ============================================================================

describe('GovernanceEngine', () => {
  let governance: DefaultGovernanceEngine;

  beforeEach(() => {
    governance = createGovernanceEngine({
      enabled: true,
      proposalThreshold: '10000',
      votingPeriod: 7,
      quorumPercent: 10,
    });

    // Set voting power for test users
    governance.setUserVotingPower('user-1', '50000');
    governance.setUserVotingPower('user-2', '30000');
  });

  describe('createProposal', () => {
    it('should create a proposal', async () => {
      const proposal = await governance.createProposal({
        proposer: 'user-1',
        title: 'Test Proposal',
        description: 'Test description',
        type: 'parameter_change',
        category: 'fees',
      });

      expect(proposal.id).toBeDefined();
      expect(proposal.status).toBe('active');
      expect(proposal.proposer).toBe('user-1');
    });

    it('should reject proposal from user with insufficient voting power', async () => {
      governance.setUserVotingPower('poor-user', '100');

      await expect(
        governance.createProposal({
          proposer: 'poor-user',
          title: 'Test',
          description: 'Test',
          type: 'parameter_change',
          category: 'fees',
        })
      ).rejects.toThrow();
    });
  });

  describe('vote', () => {
    it('should cast a vote', async () => {
      const proposal = await governance.createProposal({
        proposer: 'user-1',
        title: 'Test',
        description: 'Test',
        type: 'parameter_change',
        category: 'fees',
      });

      const vote = await governance.vote({
        proposalId: proposal.id,
        voter: 'user-2',
        support: true,
      });

      expect(vote.id).toBeDefined();
      expect(vote.support).toBe(true);
    });

    it('should reject duplicate votes', async () => {
      const proposal = await governance.createProposal({
        proposer: 'user-1',
        title: 'Test',
        description: 'Test',
        type: 'parameter_change',
        category: 'fees',
      });

      await governance.vote({
        proposalId: proposal.id,
        voter: 'user-2',
        support: true,
      });

      await expect(
        governance.vote({
          proposalId: proposal.id,
          voter: 'user-2',
          support: false,
        })
      ).rejects.toThrow();
    });
  });

  describe('delegation', () => {
    it('should delegate voting power', async () => {
      const delegation = await governance.delegate({
        delegator: 'user-2',
        delegatee: 'user-1',
        amount: '10000',
      });

      expect(delegation.id).toBeDefined();
      expect(delegation.delegator).toBe('user-2');
      expect(delegation.delegatee).toBe('user-1');
    });

    it('should track delegations correctly', async () => {
      await governance.delegate({
        delegator: 'user-2',
        delegatee: 'user-1',
        amount: '10000',
      });

      const info = await governance.getDelegations('user-1');

      expect(info.receivedFrom.length).toBe(1);
      expect(info.totalReceivedPower).toBe('10000');
    });
  });

  describe('getStats', () => {
    it('should return governance statistics', async () => {
      await governance.createProposal({
        proposer: 'user-1',
        title: 'Test',
        description: 'Test',
        type: 'parameter_change',
        category: 'fees',
      });

      const stats = await governance.getStats();

      expect(stats.totalProposals).toBe(1);
      expect(stats.activeProposals).toBe(1);
    });
  });
});

// ============================================================================
// Reputation System Tests
// ============================================================================

describe('ReputationSystem', () => {
  let reputation: DefaultReputationSystem;

  beforeEach(() => {
    reputation = createReputationSystem({
      enabled: true,
      minScore: 0,
      maxScore: 100,
      decayRate: 0.01,
    });
  });

  describe('getScore', () => {
    it('should return initial score for new user', async () => {
      const score = await reputation.getScore('new-user');

      expect(score.userId).toBe('new-user');
      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
      expect(score.tier).toBeDefined();
    });
  });

  describe('getTier', () => {
    it('should return correct tier for score', () => {
      expect(reputation.getTier(10)).toBe('newcomer');
      expect(reputation.getTier(30)).toBe('established');
      expect(reputation.getTier(50)).toBe('trusted');
      expect(reputation.getTier(70)).toBe('expert');
      expect(reputation.getTier(90)).toBe('elite');
    });
  });

  describe('recordEvent', () => {
    it('should record reputation event and update score', async () => {
      const event = await reputation.recordEvent({
        userId: 'user-1',
        eventType: 'strategy_performance',
        impact: 10,
        details: { returnPercent: 15 },
      });

      expect(event.id).toBeDefined();
      expect(event.eventType).toBe('strategy_performance');

      const score = await reputation.getScore('user-1');
      expect(score.breakdown.performance).toBeGreaterThan(50);
    });

    it('should decrease score for negative events', async () => {
      await reputation.recordEvent({
        userId: 'user-1',
        eventType: 'protocol_violation',
        impact: -30,
        details: { violation: 'rule_breach' },
      });

      const score = await reputation.getScore('user-1');
      expect(score.breakdown.compliance).toBeLessThan(100);
    });
  });

  describe('checkAccess', () => {
    it('should allow access when requirements met', async () => {
      // Set high reputation
      reputation.setFactorScores('user-1', {
        performance: 80,
        reliability: 80,
        history: 50,
        community: 70,
        compliance: 100,
      });
      await reputation.updateScore('user-1');

      // Use basic_trading which has no history requirement (minHistory: 0)
      const access = await reputation.checkAccess({
        userId: 'user-1',
        feature: 'basic_trading',
      });

      expect(access.allowed).toBe(true);
    });

    it('should deny access when requirements not met', async () => {
      // User with low reputation
      const access = await reputation.checkAccess({
        userId: 'new-user',
        feature: 'institutional_copying',
      });

      expect(access.allowed).toBe(false);
      expect(access.scoreNeeded).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Anti-Exploit Manager Tests
// ============================================================================

describe('AntiExploitManager', () => {
  let antiExploit: DefaultAntiExploitManager;

  beforeEach(() => {
    antiExploit = createAntiExploitManager({
      sybilDetectionEnabled: true,
      rateLimitingEnabled: true,
      emissionControlEnabled: true,
      slashingEnabled: true,
      minAccountAge: 7,
    });
  });

  describe('checkSybil', () => {
    it('should flag new accounts as suspicious', async () => {
      const result = await antiExploit.checkSybil('new-user');

      expect(result.userId).toBe('new-user');
      expect(result.isSuspicious).toBe(true);
      expect(result.riskFactors.length).toBeGreaterThan(0);
    });

    it('should allow established accounts', async () => {
      // Register account with old date
      await antiExploit.registerAccount('old-user', {
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        walletAddress: '0x123',
      });

      // Record some activity
      await antiExploit.recordOperation('old-user', 'trade');
      await antiExploit.recordOperation('old-user', 'stake');

      const result = await antiExploit.checkSybil('old-user');

      expect(result.isSuspicious).toBe(false);
      expect(result.recommendation).toBe('allow');
    });
  });

  describe('checkRateLimit', () => {
    it('should allow operations within limit', async () => {
      const result = await antiExploit.checkRateLimit('user-1', 'stake');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should block operations exceeding limit', async () => {
      // Record many operations
      for (let i = 0; i < 10; i++) {
        await antiExploit.recordOperation('user-1', 'stake');
      }

      const result = await antiExploit.checkRateLimit('user-1', 'stake');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('validateClaim', () => {
    it('should validate claims within caps', async () => {
      const result = await antiExploit.validateClaim({
        userId: 'user-1',
        rewardType: 'staking',
        amount: '100',
      });

      expect(result.allowed).toBe(true);
    });

    it('should reject claims exceeding daily cap', async () => {
      const result = await antiExploit.validateClaim({
        userId: 'user-1',
        rewardType: 'staking',
        amount: '9999999999999999', // Very large amount
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('cap');
    });
  });

  describe('emission control', () => {
    it('should track emissions', async () => {
      await antiExploit.recordEmission('1000');

      const status = await antiExploit.getEmissionStatus();

      expect(BigInt(status.dailyEmitted)).toBe(BigInt('1000'));
    });

    it('should check emission limits', async () => {
      const canEmitSmall = await antiExploit.canEmit('100');
      expect(canEmitSmall).toBe(true);

      const canEmitHuge = await antiExploit.canEmit('999999999999999999999');
      expect(canEmitHuge).toBe(false);
    });
  });

  describe('slashing', () => {
    it('should execute slash', async () => {
      const result = await antiExploit.executeSlash({
        targetId: 'agent-1',
        targetType: 'agent',
        condition: 'malicious_strategy',
        amount: '1000',
        evidence: ['report-1'],
        executedBy: 'governance',
      });

      expect(result.success).toBe(true);
      expect(result.slashId).toBeDefined();
      expect(result.appealable).toBe(true);
    });

    it('should track slash history', async () => {
      await antiExploit.executeSlash({
        targetId: 'agent-1',
        targetType: 'agent',
        condition: 'fraud',
        amount: '500',
        evidence: ['evidence-1'],
        executedBy: 'admin',
      });

      const history = await antiExploit.getSlashHistory('agent-1');

      expect(history.length).toBe(1);
      expect(history[0].condition).toBe('fraud');
    });
  });
});

// ============================================================================
// Tokenomics Manager Tests
// ============================================================================

describe('TokenomicsManager', () => {
  let manager: DefaultTokenomicsManager;

  beforeEach(() => {
    manager = createTokenomicsManager({
      token: {
        symbol: 'TONAI',
        name: 'TON AI Agent Token',
        decimals: 9,
        totalSupply: '1000000000',
      },
      staking: {
        enabled: true,
        minStakeAmount: '100',
        maxStakeAmount: '10000000',
        lockPeriods: [7, 30, 90, 365],
        rewardRates: [0.05, 0.08, 0.12, 0.20],
        slashingEnabled: true,
        compoundingEnabled: true,
        cooldownPeriod: 86400,
      },
      governance: {
        enabled: true,
        proposalThreshold: '10000',
        votingPeriod: 7,
        executionDelay: 2,
        quorumPercent: 10,
        supermajorityPercent: 67,
        gracePeriod: 3,
        maxActionsPerProposal: 10,
        delegationEnabled: true,
      },
    });
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const health = await manager.getHealth();

      expect(health.overall).toBe('healthy');
      expect(health.components.tokenUtility).toBe(true);
      expect(health.components.staking).toBe(true);
      expect(health.components.governance).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return ecosystem statistics', async () => {
      const stats = await manager.getStats();

      expect(stats.totalStaked).toBeDefined();
      expect(stats.totalRewardsDistributed).toBeDefined();
      expect(stats.activeProposals).toBeDefined();
    });
  });

  describe('event forwarding', () => {
    it('should forward events from all components', async () => {
      const events: string[] = [];

      manager.onEvent((event) => {
        events.push(event.type);
      });

      // Create stake to trigger event
      await manager.staking.stake({
        userId: 'user-1',
        amount: '1000',
        lockPeriod: 30,
      });

      expect(events).toContain('stake_created');
    });
  });

  describe('integration', () => {
    it('should integrate staking with governance', async () => {
      // Stake tokens
      await manager.staking.stake({
        userId: 'user-1',
        amount: '50000',
        lockPeriod: 90,
      });

      // Set voting power from stake
      manager.governance.setUserVotingPower('user-1', '50000');

      // Create and vote on proposal
      const proposal = await manager.governance.createProposal({
        proposer: 'user-1',
        title: 'Integration Test',
        description: 'Test proposal',
        type: 'text',
        category: 'other',
      });

      expect(proposal.status).toBe('active');
    });
  });
});
