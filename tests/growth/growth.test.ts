/**
 * Growth Module Tests
 *
 * Comprehensive tests for referral system, social trading, gamification,
 * viral loops, analytics, and anti-abuse modules.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  createReferralSystem,
  createSocialTradingEngine,
  createGamificationEngine,
  createViralLoopsEngine,
  createGrowthAnalyticsEngine,
  createAntiAbuseSystem,
  createGrowthEngine,
  DefaultReferralSystem,
  DefaultSocialTradingEngine,
  DefaultGamificationEngine,
  DefaultViralLoopsEngine,
  DefaultGrowthAnalyticsEngine,
  DefaultAntiAbuseSystem,
  DefaultGrowthEngine,
} from '../../src/growth';

import type {
  Referral,
  ReferralCode,
  SocialFollow,
  CommunityPortfolio,
  TradingSignal,
  UserProgress,
  Challenge,
  Leaderboard,
  ViralContent,
  PublicDashboard,
  GrowthMetrics,
  AbuseDetection,
  GrowthEvent,
} from '../../src/growth';

// ============================================================================
// Referral System Tests
// ============================================================================

describe('ReferralSystem', () => {
  let referralSystem: DefaultReferralSystem;

  beforeEach(() => {
    referralSystem = createReferralSystem();
  });

  describe('createCode', () => {
    it('should create a new referral code', async () => {
      const code = await referralSystem.createCode('user_123');

      expect(code.code).toBeDefined();
      expect(code.code.length).toBe(8);
      expect(code.ownerId).toBe('user_123');
      expect(code.active).toBe(true);
      expect(code.tier).toBe('standard');
    });

    it('should create code with custom options', async () => {
      const code = await referralSystem.createCode('user_123', {
        tier: 'premium',
        type: 'campaign',
      });

      expect(code.tier).toBe('premium');
      expect(code.type).toBe('campaign');
    });

    it('should set default rewards based on tier', async () => {
      const standardCode = await referralSystem.createCode('user_123', { tier: 'standard' });
      const premiumCode = await referralSystem.createCode('user_456', { tier: 'premium' });

      expect(premiumCode.rewards.referrerBonus).toBeGreaterThan(standardCode.rewards.referrerBonus);
    });
  });

  describe('createReferral', () => {
    it('should create a referral with valid code', async () => {
      const code = await referralSystem.createCode('referrer_123');
      const referral = await referralSystem.createReferral('referee_456', code.code);

      expect(referral.id).toBeDefined();
      expect(referral.referrerId).toBe('referrer_123');
      expect(referral.refereeId).toBe('referee_456');
      expect(referral.status).toBe('pending');
    });

    it('should reject invalid code', async () => {
      await expect(
        referralSystem.createReferral('user_123', 'INVALID')
      ).rejects.toThrow('Invalid referral code');
    });

    it('should prevent self-referral', async () => {
      const code = await referralSystem.createCode('user_123');
      await expect(
        referralSystem.createReferral('user_123', code.code)
      ).rejects.toThrow('Self-referral is not allowed');
    });

    it('should prevent duplicate referral', async () => {
      const code = await referralSystem.createCode('referrer_123');
      await referralSystem.createReferral('referee_456', code.code);

      await expect(
        referralSystem.createReferral('referee_456', code.code)
      ).rejects.toThrow('already has a referral');
    });
  });

  describe('activateReferral', () => {
    it('should activate pending referral', async () => {
      const code = await referralSystem.createCode('referrer_123');
      const referral = await referralSystem.createReferral('referee_456', code.code);

      const activated = await referralSystem.activateReferral(referral.id);

      expect(activated.status).toBe('active');
      expect(activated.activatedAt).toBeDefined();
      expect(activated.rewards.length).toBeGreaterThan(0);
    });

    it('should create rewards on activation', async () => {
      const code = await referralSystem.createCode('referrer_123');
      const referral = await referralSystem.createReferral('referee_456', code.code);

      const activated = await referralSystem.activateReferral(referral.id);
      const referrerReward = activated.rewards.find(r => r.recipientType === 'referrer');
      const refereeReward = activated.rewards.find(r => r.recipientType === 'referee');

      expect(referrerReward).toBeDefined();
      expect(refereeReward).toBeDefined();
      expect(referrerReward?.status).toBe('pending');
    });
  });

  describe('rewards', () => {
    it('should claim pending reward', async () => {
      const code = await referralSystem.createCode('referrer_123');
      const referral = await referralSystem.createReferral('referee_456', code.code);
      const activated = await referralSystem.activateReferral(referral.id);

      const reward = activated.rewards[0];
      const claimed = await referralSystem.claimReward(reward.id);

      expect(claimed.status).toBe('paid');
      expect(claimed.paidAt).toBeDefined();
      expect(claimed.txHash).toBeDefined();
    });

    it('should list unclaimed rewards', async () => {
      const code = await referralSystem.createCode('referrer_123');
      const referral = await referralSystem.createReferral('referee_456', code.code);
      await referralSystem.activateReferral(referral.id);

      const unclaimed = await referralSystem.getUnclaimedRewards('referrer_123');

      expect(unclaimed.length).toBeGreaterThan(0);
    });
  });

  describe('referralTree', () => {
    it('should build referral tree', async () => {
      // Create chain: A -> B -> C
      const codeA = await referralSystem.createCode('user_A');
      const refB = await referralSystem.createReferral('user_B', codeA.code);
      await referralSystem.activateReferral(refB.id);

      const codeB = await referralSystem.createCode('user_B');
      const refC = await referralSystem.createReferral('user_C', codeB.code);
      await referralSystem.activateReferral(refC.id);

      const tree = await referralSystem.getReferralTree('user_A');

      expect(tree.directReferrals.length).toBe(1);
      expect(tree.directReferrals[0].userId).toBe('user_B');
    });

    it('should get network stats', async () => {
      const code = await referralSystem.createCode('user_123');
      const ref = await referralSystem.createReferral('user_456', code.code);
      await referralSystem.activateReferral(ref.id);

      const stats = await referralSystem.getNetworkStats('user_123');

      expect(stats.totalReferrals).toBe(1);
      expect(stats.directReferrals).toBe(1);
    });
  });

  describe('tiers', () => {
    it('should return tier benefits', () => {
      const standardBenefits = referralSystem.getTierBenefits('standard');
      const ambassadorBenefits = referralSystem.getTierBenefits('ambassador');

      expect(standardBenefits.commissionRate).toBe(10);
      expect(ambassadorBenefits.commissionRate).toBe(25);
      expect(ambassadorBenefits.maxLevels).toBeGreaterThan(standardBenefits.maxLevels);
    });

    it('should upgrade user tier', async () => {
      await referralSystem.upgradeTier('user_123', 'premium');
      const tier = await referralSystem.getUserTier('user_123');

      expect(tier).toBe('premium');
    });
  });
});

// ============================================================================
// Social Trading Engine Tests
// ============================================================================

describe('SocialTradingEngine', () => {
  let socialEngine: DefaultSocialTradingEngine;

  beforeEach(() => {
    socialEngine = createSocialTradingEngine();
  });

  describe('follows', () => {
    it('should follow a user', async () => {
      const follow = await socialEngine.follow('follower_123', 'followed_456', 'user');

      expect(follow.id).toBeDefined();
      expect(follow.followerId).toBe('follower_123');
      expect(follow.followedId).toBe('followed_456');
      expect(follow.status).toBe('active');
    });

    it('should prevent self-follow', async () => {
      await expect(
        socialEngine.follow('user_123', 'user_123', 'user')
      ).rejects.toThrow('Cannot follow yourself');
    });

    it('should prevent duplicate follow', async () => {
      await socialEngine.follow('follower_123', 'followed_456', 'user');

      await expect(
        socialEngine.follow('follower_123', 'followed_456', 'user')
      ).rejects.toThrow('Already following');
    });

    it('should unfollow', async () => {
      const follow = await socialEngine.follow('follower_123', 'followed_456', 'user');
      await socialEngine.unfollow(follow.id);

      const followers = await socialEngine.getFollowers('followed_456');
      expect(followers.length).toBe(0);
    });

    it('should list followers and following', async () => {
      await socialEngine.follow('follower_1', 'user_123', 'user');
      await socialEngine.follow('follower_2', 'user_123', 'user');

      const followers = await socialEngine.getFollowers('user_123');
      expect(followers.length).toBe(2);

      const following = await socialEngine.getFollowing('follower_1');
      expect(following.length).toBe(1);
    });
  });

  describe('portfolios', () => {
    it('should create community portfolio', async () => {
      const portfolio = await socialEngine.createPortfolio({
        name: 'Test Portfolio',
        description: 'A test portfolio',
        creatorId: 'creator_123',
        visibility: 'public',
        type: 'curated',
      });

      expect(portfolio.id).toBeDefined();
      expect(portfolio.name).toBe('Test Portfolio');
      expect(portfolio.creatorId).toBe('creator_123');
      expect(portfolio.members.length).toBe(1);
      expect(portfolio.members[0].role).toBe('owner');
    });

    it('should allow joining portfolio', async () => {
      const portfolio = await socialEngine.createPortfolio({
        name: 'Test Portfolio',
        description: 'A test portfolio',
        creatorId: 'creator_123',
        visibility: 'public',
        type: 'curated',
      });

      const member = await socialEngine.joinPortfolio(portfolio.id, 'user_456', 100);

      expect(member.userId).toBe('user_456');
      expect(member.capitalContributed).toBe(100);
      expect(member.role).toBe('follower');
    });

    it('should validate minimum investment', async () => {
      const portfolio = await socialEngine.createPortfolio({
        name: 'Test Portfolio',
        description: 'A test portfolio',
        creatorId: 'creator_123',
        visibility: 'public',
        type: 'curated',
        rules: { minInvestment: 100 },
      });

      await expect(
        socialEngine.joinPortfolio(portfolio.id, 'user_456', 50)
      ).rejects.toThrow('Minimum investment');
    });

    it('should update portfolio allocations', async () => {
      const portfolio = await socialEngine.createPortfolio({
        name: 'Test Portfolio',
        description: 'A test portfolio',
        creatorId: 'creator_123',
        visibility: 'public',
        type: 'curated',
      });

      const updated = await socialEngine.updateAllocations(portfolio.id, [
        { weight: 60, minWeight: 50, maxWeight: 70, rebalanceThreshold: 5, strategyId: 'strategy_1' },
        { weight: 40, minWeight: 30, maxWeight: 50, rebalanceThreshold: 5, strategyId: 'strategy_2' },
      ]);

      expect(updated.allocations.length).toBe(2);
    });
  });

  describe('signals', () => {
    it('should create trading signal', async () => {
      const signal = await socialEngine.createSignal({
        creatorId: 'creator_123',
        type: 'buy',
        asset: 'TON',
        confidence: 80,
        reasoning: 'Strong momentum',
        targetPrice: 6.5,
        timeframe: '1D',
        visibility: 'public',
      });

      expect(signal.id).toBeDefined();
      expect(signal.type).toBe('buy');
      expect(signal.asset).toBe('TON');
      expect(signal.confidence).toBe(80);
    });

    it('should validate confidence range', async () => {
      await expect(
        socialEngine.createSignal({
          creatorId: 'creator_123',
          type: 'buy',
          asset: 'TON',
          confidence: 150, // Invalid
          reasoning: 'Test',
          timeframe: '1D',
          visibility: 'public',
        })
      ).rejects.toThrow('Confidence must be between');
    });

    it('should react to signal', async () => {
      const signal = await socialEngine.createSignal({
        creatorId: 'creator_123',
        type: 'buy',
        asset: 'TON',
        confidence: 80,
        reasoning: 'Test',
        timeframe: '1D',
        visibility: 'public',
      });

      const reactions = await socialEngine.reactToSignal(signal.id, 'user_456', 'like');

      expect(reactions.likes).toBe(1);
    });

    it('should list signals with filters', async () => {
      await socialEngine.createSignal({
        creatorId: 'creator_123',
        type: 'buy',
        asset: 'TON',
        confidence: 90,
        reasoning: 'Test',
        timeframe: '1D',
        visibility: 'public',
      });

      await socialEngine.createSignal({
        creatorId: 'creator_123',
        type: 'sell',
        asset: 'ETH',
        confidence: 60,
        reasoning: 'Test',
        timeframe: '1D',
        visibility: 'public',
      });

      const signals = await socialEngine.listSignals({ minConfidence: 80 });

      expect(signals.length).toBe(1);
      expect(signals[0].asset).toBe('TON');
    });
  });

  describe('socialStats', () => {
    it('should calculate social stats', async () => {
      await socialEngine.follow('follower_1', 'user_123', 'user');
      await socialEngine.follow('follower_2', 'user_123', 'user');

      await socialEngine.createSignal({
        creatorId: 'user_123',
        type: 'buy',
        asset: 'TON',
        confidence: 80,
        reasoning: 'Test',
        timeframe: '1D',
        visibility: 'public',
      });

      const stats = await socialEngine.getSocialStats('user_123');

      expect(stats.followers).toBe(2);
      expect(stats.signalsCreated).toBe(1);
    });
  });
});

// ============================================================================
// Gamification Engine Tests
// ============================================================================

describe('GamificationEngine', () => {
  let gamificationEngine: DefaultGamificationEngine;

  beforeEach(() => {
    gamificationEngine = createGamificationEngine();
  });

  describe('userProgress', () => {
    it('should initialize user progress', async () => {
      const progress = await gamificationEngine.initializeProgress('user_123');

      expect(progress.userId).toBe('user_123');
      expect(progress.xp).toBe(0);
      expect(progress.level).toBe(1);
    });

    it('should get or create user progress', async () => {
      const progress = await gamificationEngine.getUserProgress('user_123');

      expect(progress.userId).toBe('user_123');
    });
  });

  describe('XP and levels', () => {
    it('should add XP', async () => {
      await gamificationEngine.initializeProgress('user_123');
      const result = await gamificationEngine.addXp('user_123', 100, 'test');

      expect(result.xpGained).toBe(100);
      expect(result.newXp).toBe(100);
    });

    it('should level up when XP threshold reached', async () => {
      await gamificationEngine.initializeProgress('user_123');
      const result = await gamificationEngine.addXp('user_123', 2000, 'test');

      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBeGreaterThan(1);
    });

    it('should apply XP multiplier from streaks', async () => {
      await gamificationEngine.initializeProgress('user_123');
      await gamificationEngine.updateStreak('user_123', 'daily_login');

      const result = await gamificationEngine.addXp('user_123', 100, 'test');

      expect(result.multiplier).toBeGreaterThan(1);
    });

    it('should calculate level from XP', () => {
      expect(gamificationEngine.getLevel(0)).toBe(1);
      expect(gamificationEngine.getLevel(1000)).toBe(2);
      expect(gamificationEngine.getLevel(5000)).toBeGreaterThan(2);
    });
  });

  describe('achievements', () => {
    it('should get achievement definitions', () => {
      const definitions = gamificationEngine.getAchievementDefinitions();

      expect(definitions.length).toBeGreaterThan(0);
      expect(definitions.some(d => d.category === 'trading')).toBe(true);
    });

    it('should check and unlock achievements', async () => {
      await gamificationEngine.initializeProgress('user_123');

      // Update stats to trigger achievement
      const progress = await gamificationEngine.getUserProgress('user_123');
      progress.stats.totalTrades = 1;

      const unlocked = await gamificationEngine.checkAchievements('user_123');

      expect(unlocked.some(a => a.id === 'first_trade')).toBe(true);
    });

    it('should unlock specific achievement', async () => {
      await gamificationEngine.initializeProgress('user_123');

      const achievement = await gamificationEngine.unlockAchievement('user_123', 'first_trade');

      expect(achievement.unlockedAt).toBeDefined();
      expect(achievement.progress).toBe(100);
    });
  });

  describe('streaks', () => {
    it('should update streak', async () => {
      await gamificationEngine.initializeProgress('user_123');
      const streak = await gamificationEngine.updateStreak('user_123', 'daily_login');

      expect(streak.currentStreak).toBe(1);
      expect(streak.type).toBe('daily_login');
    });

    it('should get streak rewards', () => {
      const rewards = gamificationEngine.getStreakRewards('daily_login');

      expect(rewards.length).toBeGreaterThan(0);
      expect(rewards.some(r => r.day === 7)).toBe(true);
    });
  });

  describe('challenges', () => {
    it('should create challenge', async () => {
      const now = new Date();
      const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const challenge = await gamificationEngine.createChallenge({
        name: 'Trading Challenge',
        description: 'Complete 10 trades',
        type: 'individual',
        difficulty: 'medium',
        requirements: [{ metric: 'trades', operator: 'gte', value: 10, description: 'Complete 10 trades' }],
        rewards: { xp: 500 },
        startDate: now,
        endDate,
      });

      expect(challenge.id).toBeDefined();
      expect(challenge.name).toBe('Trading Challenge');
      expect(challenge.status).toBe('active');
    });

    it('should join challenge', async () => {
      const challenge = await gamificationEngine.createChallenge({
        name: 'Test Challenge',
        description: 'Test',
        type: 'individual',
        difficulty: 'easy',
        requirements: [{ metric: 'trades', operator: 'gte', value: 5, description: 'Test' }],
        rewards: { xp: 100 },
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
      });

      await gamificationEngine.initializeProgress('user_123');
      const progress = await gamificationEngine.joinChallenge(challenge.id, 'user_123');

      expect(progress.challengeId).toBe(challenge.id);
      expect(progress.progress).toBe(0);
    });

    it('should complete challenge', async () => {
      const challenge = await gamificationEngine.createChallenge({
        name: 'Test Challenge',
        description: 'Test',
        type: 'individual',
        difficulty: 'easy',
        requirements: [{ metric: 'trades', operator: 'gte', value: 5, description: 'Test' }],
        rewards: { xp: 100 },
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
      });

      await gamificationEngine.initializeProgress('user_123');
      await gamificationEngine.joinChallenge(challenge.id, 'user_123');
      const completed = await gamificationEngine.completeChallenge(challenge.id, 'user_123');

      expect(completed.completed).toBe(true);
      expect(completed.completedAt).toBeDefined();
    });
  });

  describe('leaderboards', () => {
    it('should generate leaderboard', async () => {
      await gamificationEngine.initializeProgress('user_1');
      await gamificationEngine.initializeProgress('user_2');
      await gamificationEngine.addXp('user_1', 100, 'test');
      await gamificationEngine.addXp('user_2', 200, 'test');

      const leaderboard = await gamificationEngine.getLeaderboard('global', 'weekly');

      expect(leaderboard.entries.length).toBe(2);
      expect(leaderboard.entries[0].rank).toBe(1);
      expect(leaderboard.entries[0].userId).toBe('user_2'); // Higher XP
    });

    it('should get user rank', async () => {
      await gamificationEngine.initializeProgress('user_123');
      await gamificationEngine.addXp('user_123', 100, 'test');

      const rank = await gamificationEngine.getUserRank('user_123', 'global', 'weekly');

      expect(rank).not.toBeNull();
      expect(rank?.rank).toBe(1);
    });
  });

  describe('seasonPass', () => {
    it('should get current season', async () => {
      const season = await gamificationEngine.getCurrentSeason();

      expect(season).not.toBeNull();
      expect(season?.status).toBe('active');
      expect(season?.tiers.length).toBe(100);
    });
  });
});

// ============================================================================
// Viral Loops Engine Tests
// ============================================================================

describe('ViralLoopsEngine', () => {
  let viralEngine: DefaultViralLoopsEngine;

  beforeEach(() => {
    viralEngine = createViralLoopsEngine();
  });

  describe('viralContent', () => {
    it('should create viral content', async () => {
      const content = await viralEngine.createViralContent({
        type: 'performance_card',
        creatorId: 'creator_123',
        entityId: 'strategy_456',
        title: 'My Strategy Performance',
        description: 'Check out my returns!',
      });

      expect(content.id).toBeDefined();
      expect(content.type).toBe('performance_card');
      expect(content.shareLinks.directLink).toContain(content.id);
    });

    it('should track views', async () => {
      const content = await viralEngine.createViralContent({
        type: 'achievement_card',
        creatorId: 'creator_123',
        entityId: 'achievement_456',
        title: 'Achievement',
        description: 'Test',
      });

      await viralEngine.trackView(content.id, true);
      await viralEngine.trackView(content.id, false);

      const metrics = await viralEngine.getViralMetrics(content.id);

      expect(metrics.views).toBe(2);
      expect(metrics.uniqueViews).toBe(1);
    });

    it('should track conversions and update viral coefficient', async () => {
      const content = await viralEngine.createViralContent({
        type: 'performance_card',
        creatorId: 'creator_123',
        entityId: 'strategy_456',
        title: 'Test',
        description: 'Test',
      });

      await viralEngine.trackShareClick(content.id, 'telegram');
      await viralEngine.trackClick(content.id);
      await viralEngine.trackConversion(content.id);

      const metrics = await viralEngine.getViralMetrics(content.id);

      expect(metrics.shares).toBe(1);
      expect(metrics.conversions).toBe(1);
      expect(metrics.conversionRate).toBeGreaterThan(0);
    });
  });

  describe('shareLinks', () => {
    it('should generate share links', async () => {
      const content = await viralEngine.createViralContent({
        type: 'performance_card',
        creatorId: 'creator_123',
        entityId: 'strategy_456',
        title: 'Test',
        description: 'Test',
      });

      expect(content.shareLinks.directLink).toBeDefined();
      expect(content.shareLinks.telegramLink).toContain('t.me');
      expect(content.shareLinks.twitterLink).toContain('twitter.com');
    });

    it('should generate short link', async () => {
      const shortLink = await viralEngine.generateShortLink('content_123');

      expect(shortLink).toContain('tonai.link');
    });
  });

  describe('dashboards', () => {
    it('should create public dashboard', async () => {
      const dashboard = await viralEngine.createDashboard({
        userId: 'user_123',
        title: 'My Performance Dashboard',
        description: 'Track my trading performance',
        visibility: 'public',
      });

      expect(dashboard.id).toBeDefined();
      expect(dashboard.slug).toContain('my-performance');
      expect(dashboard.visibility).toBe('public');
    });

    it('should get dashboard by slug', async () => {
      const created = await viralEngine.createDashboard({
        userId: 'user_123',
        title: 'Test Dashboard',
        description: 'Test',
        visibility: 'public',
      });

      const found = await viralEngine.getDashboardBySlug(created.slug);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('should add widgets to dashboard', async () => {
      const dashboard = await viralEngine.createDashboard({
        userId: 'user_123',
        title: 'Test Dashboard',
        description: 'Test',
        visibility: 'public',
      });

      const widget = await viralEngine.addWidget(dashboard.id, {
        type: 'performance_chart',
        title: 'Performance Chart',
        position: { row: 0, col: 0, rowSpan: 1, colSpan: 2 },
        config: {},
        dataSource: 'performance',
      });

      expect(widget.id).toBeDefined();
      expect(widget.type).toBe('performance_chart');

      const updated = await viralEngine.getDashboard(dashboard.id);
      expect(updated?.widgets.length).toBe(1);
    });
  });

  describe('analytics', () => {
    it('should get top viral content', async () => {
      await viralEngine.createViralContent({
        type: 'performance_card',
        creatorId: 'creator_123',
        entityId: 'strategy_456',
        title: 'Test',
        description: 'Test',
      });

      const top = await viralEngine.getTopViralContent(10);

      expect(top.length).toBe(1);
    });

    it('should calculate viral coefficient', async () => {
      const content = await viralEngine.createViralContent({
        type: 'performance_card',
        creatorId: 'creator_123',
        entityId: 'strategy_456',
        title: 'Test',
        description: 'Test',
      });

      await viralEngine.trackShareClick(content.id, 'telegram');
      await viralEngine.trackConversion(content.id);

      const k = await viralEngine.getViralCoefficient();

      expect(k).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Growth Analytics Engine Tests
// ============================================================================

describe('GrowthAnalyticsEngine', () => {
  let analyticsEngine: DefaultGrowthAnalyticsEngine;

  beforeEach(() => {
    analyticsEngine = createGrowthAnalyticsEngine();
  });

  describe('eventTracking', () => {
    it('should track events', async () => {
      await analyticsEngine.trackEvent('user_123', 'signup', { source: 'referral' });
      await analyticsEngine.trackEvent('user_123', 'first_trade', { amount: 100 });

      const count = await analyticsEngine.getEventCount('signup', '7d');

      expect(count).toBe(1);
    });
  });

  describe('metrics', () => {
    it('should get acquisition metrics', async () => {
      await analyticsEngine.trackEvent('user_1', 'signup', { source: 'referral' });
      await analyticsEngine.trackEvent('user_2', 'signup', { source: 'organic' });

      const metrics = await analyticsEngine.getAcquisitionMetrics('7d');

      expect(metrics.newUsers).toBe(2);
      expect(metrics.signupsBySource['referral']).toBe(1);
      expect(metrics.signupsBySource['organic']).toBe(1);
    });

    it('should get retention metrics', async () => {
      const metrics = await analyticsEngine.getRetentionMetrics('30d');

      expect(metrics.dau).toBeDefined();
      expect(metrics.wau).toBeDefined();
      expect(metrics.mau).toBeDefined();
      expect(metrics.dauMauRatio).toBeDefined();
    });

    it('should get full growth metrics', async () => {
      const metrics = await analyticsEngine.getGrowthMetrics('30d');

      expect(metrics.acquisition).toBeDefined();
      expect(metrics.activation).toBeDefined();
      expect(metrics.retention).toBeDefined();
      expect(metrics.revenue).toBeDefined();
      expect(metrics.referral).toBeDefined();
      expect(metrics.engagement).toBeDefined();
    });
  });

  describe('funnelAnalysis', () => {
    it('should get funnel analysis', async () => {
      await analyticsEngine.trackEvent('user_1', 'signup');
      await analyticsEngine.trackEvent('user_1', 'email_verified');
      await analyticsEngine.trackEvent('user_1', 'profile_completed');

      const funnel = await analyticsEngine.getFunnelAnalysis('activation');

      expect(funnel.length).toBeGreaterThan(0);
      expect(funnel[0].name).toBe('signup');
    });

    it('should define custom funnel', async () => {
      await analyticsEngine.defineFunnel('custom', ['step_1', 'step_2', 'step_3']);
      const funnel = await analyticsEngine.getFunnelAnalysis('custom');

      expect(funnel.length).toBe(3);
    });
  });

  describe('abTesting', () => {
    it('should create experiment', async () => {
      const experiment = await analyticsEngine.createExperiment({
        name: 'Button Color Test',
        description: 'Test button colors',
        variants: [
          { id: 'control', name: 'Blue', weight: 50 },
          { id: 'variant_a', name: 'Green', weight: 50 },
        ],
        targetMetric: 'click',
        minimumSampleSize: 100,
      });

      expect(experiment.id).toBeDefined();
      expect(experiment.variants.length).toBe(2);
      expect(experiment.status).toBe('running');
    });

    it('should assign variant consistently', async () => {
      const experiment = await analyticsEngine.createExperiment({
        name: 'Test',
        description: 'Test',
        variants: [
          { id: 'control', name: 'Control', weight: 50 },
          { id: 'variant_a', name: 'Variant A', weight: 50 },
        ],
        targetMetric: 'conversion',
        minimumSampleSize: 100,
      });

      const variant1 = await analyticsEngine.assignVariant(experiment.id, 'user_123');
      const variant2 = await analyticsEngine.assignVariant(experiment.id, 'user_123');

      expect(variant1).toBe(variant2); // Same user gets same variant
    });

    it('should get experiment results', async () => {
      const experiment = await analyticsEngine.createExperiment({
        name: 'Test',
        description: 'Test',
        variants: [
          { id: 'control', name: 'Control', weight: 50 },
          { id: 'variant_a', name: 'Variant A', weight: 50 },
        ],
        targetMetric: 'conversion',
        minimumSampleSize: 10,
      });

      // Assign and track events
      for (let i = 0; i < 20; i++) {
        const userId = `user_${i}`;
        await analyticsEngine.assignVariant(experiment.id, userId);
        if (i % 3 === 0) {
          await analyticsEngine.trackExperimentEvent(experiment.id, userId, 'conversion', 1);
        }
      }

      const results = await analyticsEngine.getExperimentResults(experiment.id);

      expect(results.variantResults.length).toBe(2);
    });
  });

  describe('incentiveOptimization', () => {
    it('should generate personalized offers', async () => {
      const offers = await analyticsEngine.generatePersonalizedOffers('user_123');

      expect(offers.length).toBeGreaterThan(0);
      expect(offers[0].type).toBeDefined();
    });

    it('should predict user behavior', async () => {
      await analyticsEngine.trackEvent('user_123', 'trade');
      await analyticsEngine.trackEvent('user_123', 'trade');

      const predictions = await analyticsEngine.predictUserBehavior('user_123');

      expect(predictions.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Anti-Abuse System Tests
// ============================================================================

describe('AntiAbuseSystem', () => {
  let antiAbuse: DefaultAntiAbuseSystem;

  beforeEach(() => {
    antiAbuse = createAntiAbuseSystem();
  });

  describe('sybilDetection', () => {
    it('should check sybil risk', async () => {
      const detection = await antiAbuse.checkSybilRisk('user_123');

      expect(detection.userId).toBe('user_123');
      expect(detection.riskScore).toBeGreaterThanOrEqual(0);
      expect(detection.recommendation).toBeDefined();
    });

    it('should flag linked accounts', async () => {
      await antiAbuse.flagLinkedAccounts('user_1', 'user_2', 'ip');

      const linked = await antiAbuse.getLinkedAccounts('user_1');

      expect(linked.length).toBe(1);
      expect(linked[0].userId).toBe('user_2');
    });

    it('should increase risk score with linked accounts', async () => {
      await antiAbuse.flagLinkedAccounts('user_1', 'user_2', 'ip');
      await antiAbuse.flagLinkedAccounts('user_1', 'user_3', 'device');

      const detection = await antiAbuse.checkSybilRisk('user_1');

      expect(detection.riskScore).toBeGreaterThan(0);
      expect(detection.linkedAccounts.length).toBe(2);
    });
  });

  describe('rateLimiting', () => {
    it('should check rate limit', async () => {
      const result = await antiAbuse.checkRateLimit('user_123', 'referral');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should increment rate limit', async () => {
      await antiAbuse.incrementRateLimit('user_123', 'referral');
      const result = await antiAbuse.checkRateLimit('user_123', 'referral');

      expect(result.remaining).toBe(9); // 10 - 1
    });

    it('should block when limit exceeded', async () => {
      for (let i = 0; i < 10; i++) {
        await antiAbuse.incrementRateLimit('user_123', 'referral');
      }

      const result = await antiAbuse.checkRateLimit('user_123', 'referral');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('cooldowns', () => {
    it('should set cooldown', async () => {
      const cooldown = await antiAbuse.setCooldown('user_123', 'referral', 3600, 'Rate limit');

      expect(cooldown.type).toBe('referral');
      expect(cooldown.duration).toBe(3600);
    });

    it('should check active cooldown', async () => {
      await antiAbuse.setCooldown('user_123', 'trade', 60, 'Test');

      const cooldown = await antiAbuse.getCooldown('user_123', 'trade');

      expect(cooldown).not.toBeNull();
      expect(cooldown?.type).toBe('trade');
    });

    it('should clear cooldown', async () => {
      await antiAbuse.setCooldown('user_123', 'test', 60, 'Test');
      await antiAbuse.clearCooldown('user_123', 'test');

      const cooldown = await antiAbuse.getCooldown('user_123', 'test');

      expect(cooldown).toBeNull();
    });
  });

  describe('riskScoring', () => {
    it('should calculate risk score', async () => {
      const score = await antiAbuse.calculateRiskScore('user_123');

      expect(score.userId).toBe('user_123');
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.factors.length).toBeGreaterThan(0);
      expect(score.recommendation).toBeDefined();
    });

    it('should update risk factors', async () => {
      await antiAbuse.calculateRiskScore('user_123');

      const updated = await antiAbuse.updateRiskFactors('user_123', [
        { name: 'custom_factor', weight: 0.2, value: 50, description: 'Test', detected: true },
      ]);

      expect(updated.factors.some(f => f.name === 'custom_factor')).toBe(true);
    });
  });

  describe('penalties', () => {
    it('should apply penalty', async () => {
      const penalty = await antiAbuse.applyPenalty('user_123', {
        type: 'reward_hold',
        reason: 'Suspicious activity',
        duration: 86400,
      });

      expect(penalty.id).toBeDefined();
      expect(penalty.type).toBe('reward_hold');
    });

    it('should get user penalties', async () => {
      await antiAbuse.applyPenalty('user_123', {
        type: 'warning',
        reason: 'Test',
      });

      const penalties = await antiAbuse.getUserPenalties('user_123');

      expect(penalties.length).toBe(1);
    });

    it('should revoke penalty', async () => {
      const penalty = await antiAbuse.applyPenalty('user_123', {
        type: 'reward_hold',
        reason: 'Test',
      });

      await antiAbuse.revokePenalty(penalty.id, 'False positive');

      const penalties = await antiAbuse.getUserPenalties('user_123');

      expect(penalties.length).toBe(0);
    });
  });

  describe('abuseDetection', () => {
    it('should report abuse', async () => {
      const detection = await antiAbuse.reportAbuse('user_123', 'self_referral', [
        {
          type: 'linked_account',
          description: 'Referral from linked account',
          value: 'user_456',
          weight: 0.9,
          timestamp: new Date(),
        },
      ]);

      expect(detection.id).toBeDefined();
      expect(detection.type).toBe('self_referral');
      expect(detection.status).toBe('detected');
    });

    it('should get abuse history', async () => {
      await antiAbuse.reportAbuse('user_123', 'reward_farming', [
        {
          type: 'excessive_claims',
          description: 'Too many reward claims',
          value: 100,
          weight: 0.7,
          timestamp: new Date(),
        },
      ]);

      const history = await antiAbuse.getAbuseHistory('user_123');

      expect(history.length).toBe(1);
    });
  });
});

// ============================================================================
// Growth Engine Integration Tests
// ============================================================================

describe('GrowthEngine', () => {
  let growthEngine: DefaultGrowthEngine;

  beforeEach(() => {
    growthEngine = createGrowthEngine({
      enabled: true,
    });
  });

  it('should initialize all components', () => {
    expect(growthEngine.referral).toBeDefined();
    expect(growthEngine.socialTrading).toBeDefined();
    expect(growthEngine.gamification).toBeDefined();
    expect(growthEngine.viralLoops).toBeDefined();
    expect(growthEngine.analytics).toBeDefined();
    expect(growthEngine.antiAbuse).toBeDefined();
  });

  it('should report health status', async () => {
    const health = await growthEngine.getHealth();

    expect(health.overall).toBe('healthy');
    expect(health.components.referral).toBe(true);
    expect(health.components.gamification).toBe(true);
  });

  it('should forward events from components', async () => {
    const events: GrowthEvent[] = [];
    growthEngine.onEvent(e => events.push(e));

    // Create a referral code (triggers event)
    await growthEngine.referral.createCode('user_123');

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBe('referral_created');
  });

  it('should get aggregated stats', async () => {
    const stats = await growthEngine.getStats();

    expect(stats.activeChallenges).toBeDefined();
    expect(stats.viralCoefficient).toBeDefined();
    expect(stats.dailyActiveUsers).toBeDefined();
  });

  describe('integration scenarios', () => {
    it('should handle complete referral flow', async () => {
      // 1. User A creates referral code
      const code = await growthEngine.referral.createCode('user_A');

      // 2. User B signs up with code
      const referral = await growthEngine.referral.createReferral('user_B', code.code);
      await growthEngine.referral.activateReferral(referral.id);

      // 3. Track signup event
      await growthEngine.analytics.trackEvent('user_B', 'signup', { source: 'referral' });

      // 4. Award XP for signup
      await growthEngine.gamification.addXp('user_B', 100, 'signup');

      // 5. Check achievements
      const unlocked = await growthEngine.gamification.checkAchievements('user_B');

      // 6. Verify referrer rewards
      const unclaimedRewards = await growthEngine.referral.getUnclaimedRewards('user_A');

      expect(unclaimedRewards.length).toBeGreaterThan(0);
    });

    it('should detect and handle abuse', async () => {
      // 1. Check initial risk
      const initialRisk = await growthEngine.antiAbuse.checkSybilRisk('user_123');
      expect(initialRisk.recommendation).toBe('allow');

      // 2. Flag suspicious activity
      await growthEngine.antiAbuse.flagLinkedAccounts('user_123', 'user_456', 'device');
      await growthEngine.antiAbuse.flagLinkedAccounts('user_123', 'user_789', 'ip');

      // 3. Check updated risk
      const updatedRisk = await growthEngine.antiAbuse.checkSybilRisk('user_123');
      expect(updatedRisk.riskScore).toBeGreaterThan(initialRisk.riskScore);

      // 4. Apply rate limits
      for (let i = 0; i < 10; i++) {
        await growthEngine.antiAbuse.incrementRateLimit('user_123', 'referral');
      }

      const limitResult = await growthEngine.antiAbuse.checkRateLimit('user_123', 'referral');
      expect(limitResult.allowed).toBe(false);
    });
  });
});
