/**
 * TONAIAgent - Gamification Layer
 *
 * Implements XP and leveling, achievements, badges, streaks,
 * challenges, leaderboards, and seasonal campaigns.
 */

import {
  UserProgress,
  UserProgressStats,
  Achievement,
  AchievementCategory,
  GamificationBadge,
  Streak,
  StreakType,
  StreakReward,
  Challenge,
  ChallengeType,
  ChallengeProgress,
  ChallengeRequirement,
  ChallengeRewards,
  Leaderboard,
  LeaderboardType,
  LeaderboardPeriod,
  LeaderboardEntry,
  SeasonPass,
  SeasonPassProgress,
  SeasonPassTier,
  SeasonReward,
  GamificationConfig,
  GrowthEvent,
  GrowthEventCallback,
} from './types';

// ============================================================================
// Gamification Engine Interface
// ============================================================================

export interface GamificationEngine {
  // User progress
  getUserProgress(userId: string): Promise<UserProgress>;
  initializeProgress(userId: string): Promise<UserProgress>;
  addXp(userId: string, amount: number, source: string): Promise<XpResult>;
  getLevel(xp: number): number;
  getXpForLevel(level: number): number;

  // Achievements
  getAchievements(userId: string): Promise<Achievement[]>;
  checkAchievements(userId: string): Promise<Achievement[]>;
  unlockAchievement(userId: string, achievementId: string): Promise<Achievement>;
  getAchievementDefinitions(): AchievementDefinition[];

  // Badges
  getBadges(userId: string): Promise<GamificationBadge[]>;
  awardBadge(userId: string, badge: Omit<GamificationBadge, 'earnedAt'>): Promise<GamificationBadge>;

  // Streaks
  getStreaks(userId: string): Promise<Streak[]>;
  updateStreak(userId: string, type: StreakType): Promise<Streak>;
  getStreakRewards(type: StreakType): StreakReward[];

  // Challenges
  createChallenge(input: CreateChallengeInput): Promise<Challenge>;
  getChallenge(challengeId: string): Promise<Challenge | null>;
  joinChallenge(challengeId: string, userId: string): Promise<ChallengeProgress>;
  updateChallengeProgress(challengeId: string, userId: string, value: number): Promise<ChallengeProgress>;
  completeChallenge(challengeId: string, userId: string): Promise<ChallengeProgress>;
  listChallenges(filter?: ChallengeFilter): Promise<Challenge[]>;

  // Leaderboards
  getLeaderboard(type: LeaderboardType, period: LeaderboardPeriod, limit?: number): Promise<Leaderboard>;
  getUserRank(userId: string, type: LeaderboardType, period: LeaderboardPeriod): Promise<LeaderboardEntry | null>;
  updateLeaderboard(type: LeaderboardType, period: LeaderboardPeriod): Promise<Leaderboard>;

  // Season pass
  getCurrentSeason(): Promise<SeasonPass | null>;
  getSeasonProgress(userId: string): Promise<SeasonPassProgress | null>;
  claimSeasonReward(userId: string, tier: number): Promise<SeasonReward>;
  upgradeToPremium(userId: string): Promise<SeasonPassProgress>;

  // Events
  onEvent(callback: GrowthEventCallback): void;
}

// ============================================================================
// Types
// ============================================================================

export interface XpResult {
  previousXp: number;
  newXp: number;
  xpGained: number;
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  multiplier: number;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: Achievement['tier'];
  xpReward: number;
  tokenReward?: number;
  target: number;
  metric: string;
  secret: boolean;
}

export interface CreateChallengeInput {
  name: string;
  description: string;
  type: ChallengeType;
  difficulty: Challenge['difficulty'];
  requirements: ChallengeRequirement[];
  rewards: ChallengeRewards;
  startDate: Date;
  endDate: Date;
  maxParticipants?: number;
}

export interface ChallengeFilter {
  type?: ChallengeType;
  difficulty?: Challenge['difficulty'];
  status?: Challenge['status'];
  creatorId?: string;
  sortBy?: 'start_date' | 'participants' | 'prize_pool';
  limit?: number;
}

export interface GamificationEngineConfig {
  xpMultiplier: number;
  dailyXpCap: number;
  streakBonusMultiplier: number;
  seasonPassEnabled: boolean;
  baseXpPerLevel: number;
  levelScalingFactor: number;
}

// ============================================================================
// Default Gamification Engine Implementation
// ============================================================================

export class DefaultGamificationEngine implements GamificationEngine {
  private readonly userProgress: Map<string, UserProgress> = new Map();
  private readonly challenges: Map<string, Challenge> = new Map();
  private readonly challengeProgress: Map<string, Map<string, ChallengeProgress>> = new Map();
  private readonly leaderboards: Map<string, Leaderboard> = new Map();
  private readonly seasonPasses: Map<string, SeasonPass> = new Map();
  private readonly seasonProgress: Map<string, SeasonPassProgress> = new Map();
  private readonly dailyXpTracker: Map<string, { date: string; xp: number }> = new Map();
  private readonly eventCallbacks: GrowthEventCallback[] = [];
  readonly config: GamificationEngineConfig;

  constructor(config?: Partial<GamificationConfig>) {
    this.config = {
      xpMultiplier: config?.xpMultiplier ?? 1,
      dailyXpCap: config?.dailyXpCap ?? 10000,
      streakBonusMultiplier: config?.streakBonusMultiplier ?? 0.1,
      seasonPassEnabled: config?.seasonPassEnabled ?? true,
      baseXpPerLevel: 1000,
      levelScalingFactor: 1.5,
    };

    // Initialize a default season
    this.initializeDefaultSeason();
  }

  // ============================================================================
  // User Progress
  // ============================================================================

  async getUserProgress(userId: string): Promise<UserProgress> {
    let progress = this.userProgress.get(userId);
    if (!progress) {
      progress = await this.initializeProgress(userId);
    }
    return progress;
  }

  async initializeProgress(userId: string): Promise<UserProgress> {
    const now = new Date();
    const progress: UserProgress = {
      userId,
      xp: 0,
      level: 1,
      nextLevelXp: this.getXpForLevel(2),
      achievements: [],
      badges: [],
      streaks: [],
      challenges: [],
      stats: {
        totalTrades: 0,
        totalVolume: 0,
        totalProfit: 0,
        referralsCompleted: 0,
        challengesCompleted: 0,
        achievementsUnlocked: 0,
        daysActive: 1,
        longestStreak: 0,
      },
      lastActivityAt: now,
    };

    this.userProgress.set(userId, progress);
    return progress;
  }

  async addXp(userId: string, amount: number, _source: string): Promise<XpResult> {
    const progress = await this.getUserProgress(userId);
    const previousXp = progress.xp;
    const previousLevel = progress.level;

    // Check daily XP cap
    const today = new Date().toISOString().split('T')[0];
    const dailyTracker = this.dailyXpTracker.get(userId);
    let dailyXp = 0;
    if (dailyTracker && dailyTracker.date === today) {
      dailyXp = dailyTracker.xp;
    }

    // Calculate multiplier from streaks
    let multiplier = this.config.xpMultiplier;
    for (const streak of progress.streaks) {
      if (streak.currentStreak > 0) {
        multiplier += streak.multiplier;
      }
    }

    // Apply multiplier and daily cap
    let xpToAdd = Math.round(amount * multiplier);
    const remainingCap = this.config.dailyXpCap - dailyXp;
    xpToAdd = Math.min(xpToAdd, remainingCap);

    if (xpToAdd <= 0) {
      return {
        previousXp,
        newXp: previousXp,
        xpGained: 0,
        previousLevel,
        newLevel: previousLevel,
        leveledUp: false,
        multiplier,
      };
    }

    // Update daily tracker
    this.dailyXpTracker.set(userId, { date: today, xp: dailyXp + xpToAdd });

    // Add XP
    progress.xp += xpToAdd;

    // Check for level up
    let newLevel = previousLevel;
    while (progress.xp >= this.getXpForLevel(newLevel + 1)) {
      newLevel++;
    }

    const leveledUp = newLevel > previousLevel;
    if (leveledUp) {
      progress.level = newLevel;
      progress.nextLevelXp = this.getXpForLevel(newLevel + 1);

      this.emitEvent({
        id: this.generateId('event'),
        timestamp: new Date(),
        type: 'level_up',
        severity: 'info',
        source: 'gamification_engine',
        userId,
        message: `User ${userId} leveled up to level ${newLevel}`,
        data: { userId, previousLevel, newLevel, xp: progress.xp },
      });
    }

    progress.lastActivityAt = new Date();
    this.userProgress.set(userId, progress);

    return {
      previousXp,
      newXp: progress.xp,
      xpGained: xpToAdd,
      previousLevel,
      newLevel,
      leveledUp,
      multiplier,
    };
  }

  getLevel(xp: number): number {
    let level = 1;
    while (xp >= this.getXpForLevel(level + 1)) {
      level++;
    }
    return level;
  }

  getXpForLevel(level: number): number {
    if (level <= 1) return 0;
    return Math.floor(
      this.config.baseXpPerLevel * Math.pow(this.config.levelScalingFactor, level - 2)
    );
  }

  // ============================================================================
  // Achievements
  // ============================================================================

  async getAchievements(userId: string): Promise<Achievement[]> {
    const progress = await this.getUserProgress(userId);
    return progress.achievements;
  }

  async checkAchievements(userId: string): Promise<Achievement[]> {
    const progress = await this.getUserProgress(userId);
    const definitions = this.getAchievementDefinitions();
    const unlockedIds = new Set(progress.achievements.filter(a => a.unlockedAt).map(a => a.id));
    const newlyUnlocked: Achievement[] = [];

    for (const def of definitions) {
      if (unlockedIds.has(def.id)) continue;

      const currentValue = this.getAchievementProgress(progress.stats, def.metric);
      const progressPercent = Math.min(100, (currentValue / def.target) * 100);

      // Update or create achievement progress
      let achievement = progress.achievements.find(a => a.id === def.id);
      if (!achievement) {
        achievement = {
          id: def.id,
          name: def.name,
          description: def.description,
          category: def.category,
          tier: def.tier,
          xpReward: def.xpReward,
          tokenReward: def.tokenReward,
          progress: progressPercent,
          target: def.target,
          secret: def.secret,
        };
        progress.achievements.push(achievement);
      } else {
        achievement.progress = progressPercent;
      }

      // Check for unlock
      if (currentValue >= def.target && !achievement.unlockedAt) {
        achievement.unlockedAt = new Date();
        achievement.progress = 100;
        newlyUnlocked.push(achievement);

        // Award XP
        await this.addXp(userId, def.xpReward, `achievement:${def.id}`);

        this.emitEvent({
          id: this.generateId('event'),
          timestamp: new Date(),
          type: 'achievement_unlocked',
          severity: 'info',
          source: 'gamification_engine',
          userId,
          message: `Achievement unlocked: ${def.name}`,
          data: { userId, achievementId: def.id, xpReward: def.xpReward },
        });
      }
    }

    progress.stats.achievementsUnlocked = progress.achievements.filter(a => a.unlockedAt).length;
    this.userProgress.set(userId, progress);

    return newlyUnlocked;
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<Achievement> {
    const progress = await this.getUserProgress(userId);
    const def = this.getAchievementDefinitions().find(d => d.id === achievementId);

    if (!def) {
      throw new Error(`Achievement not found: ${achievementId}`);
    }

    let achievement = progress.achievements.find(a => a.id === achievementId);
    if (achievement?.unlockedAt) {
      throw new Error(`Achievement already unlocked: ${achievementId}`);
    }

    if (!achievement) {
      achievement = {
        id: def.id,
        name: def.name,
        description: def.description,
        category: def.category,
        tier: def.tier,
        xpReward: def.xpReward,
        tokenReward: def.tokenReward,
        progress: 100,
        target: def.target,
        secret: def.secret,
        unlockedAt: new Date(),
      };
      progress.achievements.push(achievement);
    } else {
      achievement.unlockedAt = new Date();
      achievement.progress = 100;
    }

    await this.addXp(userId, def.xpReward, `achievement:${achievementId}`);
    progress.stats.achievementsUnlocked++;
    this.userProgress.set(userId, progress);

    return achievement;
  }

  getAchievementDefinitions(): AchievementDefinition[] {
    return [
      // Trading achievements
      { id: 'first_trade', name: 'First Steps', description: 'Complete your first trade', category: 'trading', tier: 'bronze', xpReward: 50, target: 1, metric: 'totalTrades', secret: false },
      { id: 'trades_10', name: 'Getting Started', description: 'Complete 10 trades', category: 'trading', tier: 'bronze', xpReward: 100, target: 10, metric: 'totalTrades', secret: false },
      { id: 'trades_100', name: 'Active Trader', description: 'Complete 100 trades', category: 'trading', tier: 'silver', xpReward: 500, target: 100, metric: 'totalTrades', secret: false },
      { id: 'trades_1000', name: 'Trading Pro', description: 'Complete 1000 trades', category: 'trading', tier: 'gold', xpReward: 2000, target: 1000, metric: 'totalTrades', secret: false },

      // Volume achievements
      { id: 'volume_1000', name: 'Growing Portfolio', description: 'Trade 1,000 TON in volume', category: 'trading', tier: 'bronze', xpReward: 100, target: 1000, metric: 'totalVolume', secret: false },
      { id: 'volume_10000', name: 'Big Player', description: 'Trade 10,000 TON in volume', category: 'trading', tier: 'silver', xpReward: 500, target: 10000, metric: 'totalVolume', secret: false },
      { id: 'volume_100000', name: 'Whale', description: 'Trade 100,000 TON in volume', category: 'trading', tier: 'gold', xpReward: 2000, target: 100000, metric: 'totalVolume', secret: false },

      // Referral achievements
      { id: 'referral_first', name: 'Social Butterfly', description: 'Refer your first friend', category: 'referral', tier: 'bronze', xpReward: 100, target: 1, metric: 'referralsCompleted', secret: false },
      { id: 'referral_10', name: 'Influencer', description: 'Refer 10 friends', category: 'referral', tier: 'silver', xpReward: 500, target: 10, metric: 'referralsCompleted', secret: false },
      { id: 'referral_50', name: 'Community Builder', description: 'Refer 50 friends', category: 'referral', tier: 'gold', xpReward: 2000, target: 50, metric: 'referralsCompleted', secret: false },
      { id: 'referral_100', name: 'Ambassador', description: 'Refer 100 friends', category: 'referral', tier: 'platinum', xpReward: 5000, tokenReward: 100, target: 100, metric: 'referralsCompleted', secret: false },

      // Streak achievements
      { id: 'streak_7', name: 'Consistent', description: 'Maintain a 7-day streak', category: 'milestone', tier: 'silver', xpReward: 200, target: 7, metric: 'longestStreak', secret: false },
      { id: 'streak_30', name: 'Dedicated', description: 'Maintain a 30-day streak', category: 'milestone', tier: 'gold', xpReward: 1000, target: 30, metric: 'longestStreak', secret: false },
      { id: 'streak_100', name: 'Unstoppable', description: 'Maintain a 100-day streak', category: 'milestone', tier: 'platinum', xpReward: 5000, tokenReward: 50, target: 100, metric: 'longestStreak', secret: false },

      // Challenge achievements
      { id: 'challenge_first', name: 'Challenger', description: 'Complete your first challenge', category: 'milestone', tier: 'bronze', xpReward: 100, target: 1, metric: 'challengesCompleted', secret: false },
      { id: 'challenge_10', name: 'Challenge Master', description: 'Complete 10 challenges', category: 'milestone', tier: 'silver', xpReward: 500, target: 10, metric: 'challengesCompleted', secret: false },

      // Secret achievements
      { id: 'diamond_hands', name: 'Diamond Hands', description: 'Hold during 50% drawdown and recover', category: 'special', tier: 'diamond', xpReward: 5000, tokenReward: 100, target: 1, metric: 'special', secret: true },
      { id: 'early_adopter', name: 'Pioneer', description: 'Be among the first 1000 users', category: 'special', tier: 'legendary', xpReward: 10000, tokenReward: 500, target: 1, metric: 'special', secret: true },
    ];
  }

  // ============================================================================
  // Badges
  // ============================================================================

  async getBadges(userId: string): Promise<GamificationBadge[]> {
    const progress = await this.getUserProgress(userId);
    return progress.badges;
  }

  async awardBadge(
    userId: string,
    badge: Omit<GamificationBadge, 'earnedAt'>
  ): Promise<GamificationBadge> {
    const progress = await this.getUserProgress(userId);

    // Check if already has badge
    if (progress.badges.some(b => b.id === badge.id)) {
      throw new Error(`User already has badge: ${badge.id}`);
    }

    const fullBadge: GamificationBadge = {
      ...badge,
      earnedAt: new Date(),
    };

    progress.badges.push(fullBadge);
    this.userProgress.set(userId, progress);

    return fullBadge;
  }

  // ============================================================================
  // Streaks
  // ============================================================================

  async getStreaks(userId: string): Promise<Streak[]> {
    const progress = await this.getUserProgress(userId);
    return progress.streaks;
  }

  async updateStreak(userId: string, type: StreakType): Promise<Streak> {
    const progress = await this.getUserProgress(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = progress.streaks.find(s => s.type === type);

    if (!streak) {
      // Create new streak starting at day 1
      streak = {
        id: this.generateId('streak'),
        userId,
        type,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
        rewards: this.getStreakRewards(type),
        multiplier: this.config.streakBonusMultiplier,
      };
      progress.streaks.push(streak);
      progress.stats.longestStreak = Math.max(progress.stats.longestStreak, 1);
      return streak;
    }

    const lastActivity = new Date(streak.lastActivityDate);
    lastActivity.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000));

    if (daysDiff === 0) {
      // Same day, no update needed
      return streak;
    } else if (daysDiff === 1) {
      // Consecutive day - increment streak
      streak.currentStreak++;
      streak.multiplier = Math.min(1, streak.currentStreak * this.config.streakBonusMultiplier);

      // Check for new record
      if (streak.currentStreak > streak.longestStreak) {
        streak.longestStreak = streak.currentStreak;
        progress.stats.longestStreak = Math.max(progress.stats.longestStreak, streak.longestStreak);
      }

      // Award streak rewards
      const reward = streak.rewards.find(r => r.day === streak.currentStreak);
      if (reward) {
        await this.addXp(userId, reward.xpBonus, `streak:${type}:day${streak.currentStreak}`);
      }
    } else {
      // Streak broken - start new streak at day 1
      streak.currentStreak = 1;
      streak.multiplier = this.config.streakBonusMultiplier;
    }

    streak.lastActivityDate = today;
    this.userProgress.set(userId, progress);

    return streak;
  }

  getStreakRewards(type: StreakType): StreakReward[] {
    const baseRewards: Record<StreakType, StreakReward[]> = {
      daily_login: [
        { day: 3, xpBonus: 50 },
        { day: 7, xpBonus: 100, specialReward: 'Weekly Bonus Badge' },
        { day: 14, xpBonus: 200 },
        { day: 30, xpBonus: 500, tokenReward: 5, specialReward: 'Monthly Streak Badge' },
        { day: 100, xpBonus: 2000, tokenReward: 50, specialReward: 'Centurion Badge' },
      ],
      daily_trade: [
        { day: 3, xpBonus: 100 },
        { day: 7, xpBonus: 250 },
        { day: 14, xpBonus: 500 },
        { day: 30, xpBonus: 1000, tokenReward: 10 },
      ],
      profit_streak: [
        { day: 3, xpBonus: 200 },
        { day: 7, xpBonus: 500 },
        { day: 14, xpBonus: 1000 },
        { day: 30, xpBonus: 2500, tokenReward: 25 },
      ],
      referral_streak: [
        { day: 3, xpBonus: 150 },
        { day: 7, xpBonus: 300, tokenReward: 5 },
        { day: 14, xpBonus: 600, tokenReward: 10 },
      ],
    };

    return baseRewards[type] ?? [];
  }

  // ============================================================================
  // Challenges
  // ============================================================================

  async createChallenge(input: CreateChallengeInput): Promise<Challenge> {
    const challengeId = this.generateId('challenge');

    const challenge: Challenge = {
      id: challengeId,
      name: input.name,
      description: input.description,
      type: input.type,
      difficulty: input.difficulty,
      requirements: input.requirements,
      rewards: input.rewards,
      participants: 0,
      startDate: input.startDate,
      endDate: input.endDate,
      status: new Date() < input.startDate ? 'upcoming' : 'active',
      maxParticipants: input.maxParticipants,
    };

    this.challenges.set(challengeId, challenge);
    this.challengeProgress.set(challengeId, new Map());

    return challenge;
  }

  async getChallenge(challengeId: string): Promise<Challenge | null> {
    return this.challenges.get(challengeId) ?? null;
  }

  async joinChallenge(challengeId: string, userId: string): Promise<ChallengeProgress> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new Error(`Challenge not found: ${challengeId}`);
    }

    if (challenge.status !== 'active' && challenge.status !== 'upcoming') {
      throw new Error(`Challenge is not active: ${challengeId}`);
    }

    const progressMap = this.challengeProgress.get(challengeId)!;
    if (progressMap.has(userId)) {
      throw new Error(`Already joined challenge: ${challengeId}`);
    }

    if (challenge.maxParticipants && challenge.participants >= challenge.maxParticipants) {
      throw new Error('Challenge has reached maximum participants');
    }

    const progress: ChallengeProgress = {
      challengeId,
      userId,
      progress: 0,
      currentValue: 0,
      targetValue: challenge.requirements[0]?.value ?? 100,
      completed: false,
      rewardsClaimed: false,
    };

    progressMap.set(userId, progress);
    challenge.participants++;

    // Update user progress
    const userProgress = await this.getUserProgress(userId);
    userProgress.challenges.push(progress);
    this.userProgress.set(userId, userProgress);

    return progress;
  }

  async updateChallengeProgress(
    challengeId: string,
    userId: string,
    value: number
  ): Promise<ChallengeProgress> {
    const progressMap = this.challengeProgress.get(challengeId);
    if (!progressMap) {
      throw new Error(`Challenge not found: ${challengeId}`);
    }

    const progress = progressMap.get(userId);
    if (!progress) {
      throw new Error(`Not participating in challenge: ${challengeId}`);
    }

    progress.currentValue = value;
    progress.progress = Math.min(100, (value / progress.targetValue) * 100);

    if (progress.currentValue >= progress.targetValue && !progress.completed) {
      return this.completeChallenge(challengeId, userId);
    }

    progressMap.set(userId, progress);
    return progress;
  }

  async completeChallenge(challengeId: string, userId: string): Promise<ChallengeProgress> {
    const challenge = this.challenges.get(challengeId);
    const progressMap = this.challengeProgress.get(challengeId);
    if (!challenge || !progressMap) {
      throw new Error(`Challenge not found: ${challengeId}`);
    }

    const progress = progressMap.get(userId);
    if (!progress) {
      throw new Error(`Not participating in challenge: ${challengeId}`);
    }

    if (progress.completed) {
      return progress;
    }

    progress.completed = true;
    progress.completedAt = new Date();
    progress.progress = 100;

    // Award rewards
    await this.addXp(userId, challenge.rewards.xp, `challenge:${challengeId}`);

    // Update user stats
    const userProgress = await this.getUserProgress(userId);
    userProgress.stats.challengesCompleted++;
    this.userProgress.set(userId, userProgress);

    // Check achievements
    await this.checkAchievements(userId);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: new Date(),
      type: 'challenge_completed',
      severity: 'info',
      source: 'gamification_engine',
      userId,
      message: `Challenge completed: ${challenge.name}`,
      data: { userId, challengeId, rewards: challenge.rewards },
    });

    progressMap.set(userId, progress);
    return progress;
  }

  async listChallenges(filter?: ChallengeFilter): Promise<Challenge[]> {
    let challenges = Array.from(this.challenges.values());

    if (filter?.type) {
      challenges = challenges.filter(c => c.type === filter.type);
    }
    if (filter?.difficulty) {
      challenges = challenges.filter(c => c.difficulty === filter.difficulty);
    }
    if (filter?.status) {
      challenges = challenges.filter(c => c.status === filter.status);
    }

    if (filter?.sortBy) {
      challenges.sort((a, b) => {
        switch (filter.sortBy) {
          case 'start_date':
            return b.startDate.getTime() - a.startDate.getTime();
          case 'participants':
            return b.participants - a.participants;
          case 'prize_pool':
            return (b.rewards.prizePool ?? 0) - (a.rewards.prizePool ?? 0);
          default:
            return 0;
        }
      });
    }

    if (filter?.limit) {
      challenges = challenges.slice(0, filter.limit);
    }

    return challenges;
  }

  // ============================================================================
  // Leaderboards
  // ============================================================================

  async getLeaderboard(
    type: LeaderboardType,
    period: LeaderboardPeriod,
    limit: number = 100
  ): Promise<Leaderboard> {
    const key = `${type}:${period}`;
    let leaderboard = this.leaderboards.get(key);

    if (!leaderboard) {
      leaderboard = await this.updateLeaderboard(type, period);
    }

    return {
      ...leaderboard,
      entries: leaderboard.entries.slice(0, limit),
    };
  }

  async getUserRank(
    userId: string,
    type: LeaderboardType,
    period: LeaderboardPeriod
  ): Promise<LeaderboardEntry | null> {
    const leaderboard = await this.getLeaderboard(type, period, 10000);
    return leaderboard.entries.find(e => e.userId === userId) ?? null;
  }

  async updateLeaderboard(type: LeaderboardType, period: LeaderboardPeriod): Promise<Leaderboard> {
    const key = `${type}:${period}`;
    const now = new Date();

    // Calculate reset time based on period
    const resetsAt = this.calculateResetTime(period);

    // Generate entries from user progress
    const entries: LeaderboardEntry[] = [];
    for (const [userId, progress] of this.userProgress.entries()) {
      const score = this.calculateLeaderboardScore(type, progress);
      entries.push({
        rank: 0,
        userId,
        displayName: userId,
        score,
        change: 0,
      });
    }

    // Sort and assign ranks
    entries.sort((a, b) => b.score - a.score);
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    const leaderboard: Leaderboard = {
      id: key,
      name: this.getLeaderboardName(type, period),
      type,
      period,
      entries,
      rewards: this.getLeaderboardRewards(type),
      updatedAt: now,
      resetsAt,
    };

    this.leaderboards.set(key, leaderboard);

    this.emitEvent({
      id: this.generateId('event'),
      timestamp: now,
      type: 'leaderboard_updated',
      severity: 'info',
      source: 'gamification_engine',
      message: `Leaderboard updated: ${leaderboard.name}`,
      data: { type, period, totalEntries: entries.length },
    });

    return leaderboard;
  }

  // ============================================================================
  // Season Pass
  // ============================================================================

  async getCurrentSeason(): Promise<SeasonPass | null> {
    const now = new Date();
    for (const season of this.seasonPasses.values()) {
      if (season.startDate <= now && season.endDate >= now && season.status === 'active') {
        return season;
      }
    }
    return null;
  }

  async getSeasonProgress(userId: string): Promise<SeasonPassProgress | null> {
    return this.seasonProgress.get(userId) ?? null;
  }

  async claimSeasonReward(userId: string, tier: number): Promise<SeasonReward> {
    const season = await this.getCurrentSeason();
    if (!season) {
      throw new Error('No active season');
    }

    const progress = await this.getSeasonProgress(userId);
    if (!progress) {
      throw new Error('Not enrolled in season');
    }

    if (progress.currentTier < tier) {
      throw new Error(`Haven't reached tier ${tier} yet`);
    }

    if (progress.claimedTiers.includes(tier)) {
      throw new Error(`Already claimed tier ${tier}`);
    }

    const seasonTier = season.tiers.find(t => t.level === tier);
    if (!seasonTier) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    const reward = progress.isPremium ? seasonTier.premiumReward : seasonTier.freeReward;
    if (!reward) {
      throw new Error('No reward available for this tier');
    }

    // Award XP if applicable
    if (reward.type === 'xp') {
      await this.addXp(userId, reward.value as number, `season:tier${tier}`);
    }

    progress.claimedTiers.push(tier);
    this.seasonProgress.set(userId, progress);

    return reward;
  }

  async upgradeToPremium(userId: string): Promise<SeasonPassProgress> {
    const progress = await this.getSeasonProgress(userId);
    if (!progress) {
      throw new Error('Not enrolled in season');
    }

    if (progress.isPremium) {
      throw new Error('Already premium');
    }

    progress.isPremium = true;
    this.seasonProgress.set(userId, progress);

    return progress;
  }

  onEvent(callback: GrowthEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private getAchievementProgress(stats: UserProgressStats, metric: string): number {
    switch (metric) {
      case 'totalTrades':
        return stats.totalTrades;
      case 'totalVolume':
        return stats.totalVolume;
      case 'referralsCompleted':
        return stats.referralsCompleted;
      case 'challengesCompleted':
        return stats.challengesCompleted;
      case 'longestStreak':
        return stats.longestStreak;
      case 'daysActive':
        return stats.daysActive;
      default:
        return 0;
    }
  }

  private calculateLeaderboardScore(type: LeaderboardType, progress: UserProgress): number {
    switch (type) {
      case 'global':
        return progress.xp;
      case 'category':
        return progress.stats.totalProfit;
      case 'friends':
        return progress.level * 100 + progress.xp;
      default:
        return progress.xp;
    }
  }

  private getLeaderboardName(type: LeaderboardType, period: LeaderboardPeriod): string {
    const typeNames: Record<LeaderboardType, string> = {
      global: 'Global Leaderboard',
      regional: 'Regional Leaderboard',
      category: 'Category Leaderboard',
      friends: 'Friends Leaderboard',
      challenge: 'Challenge Leaderboard',
    };

    const periodNames: Record<LeaderboardPeriod, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      seasonal: 'Seasonal',
      all_time: 'All-Time',
    };

    return `${periodNames[period]} ${typeNames[type]}`;
  }

  private getLeaderboardRewards(_type: LeaderboardType): Leaderboard['rewards'] {
    return {
      prizes: [
        { minRank: 1, maxRank: 1, xp: 5000, tokens: 100, badge: 'champion', title: 'Champion' },
        { minRank: 2, maxRank: 2, xp: 3000, tokens: 50, badge: 'runner_up' },
        { minRank: 3, maxRank: 3, xp: 2000, tokens: 25, badge: 'third_place' },
        { minRank: 4, maxRank: 10, xp: 1000, tokens: 10 },
        { minRank: 11, maxRank: 50, xp: 500 },
        { minRank: 51, maxRank: 100, xp: 250 },
      ],
      participationReward: 50,
      minimumParticipants: 10,
    };
  }

  private calculateResetTime(period: LeaderboardPeriod): Date {
    const now = new Date();
    switch (period) {
      case 'daily':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
      case 'weekly':
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + (7 - nextWeek.getDay()));
        nextWeek.setHours(0, 0, 0, 0);
        return nextWeek;
      case 'monthly':
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return nextMonth;
      case 'seasonal':
        const nextSeason = new Date(now);
        nextSeason.setMonth(nextSeason.getMonth() + 3);
        return nextSeason;
      default:
        return new Date('2099-12-31');
    }
  }

  private initializeDefaultSeason(): void {
    const now = new Date();
    const seasonEnd = new Date(now);
    seasonEnd.setMonth(seasonEnd.getMonth() + 3);

    const season: SeasonPass = {
      id: 'season_1',
      name: 'Season 1: Genesis',
      theme: 'genesis',
      startDate: now,
      endDate: seasonEnd,
      tiers: this.generateSeasonTiers(),
      premiumPrice: 50,
      status: 'active',
    };

    this.seasonPasses.set(season.id, season);
  }

  private generateSeasonTiers(): SeasonPassTier[] {
    const tiers: SeasonPassTier[] = [];
    for (let i = 1; i <= 100; i++) {
      tiers.push({
        level: i,
        xpRequired: i * 100,
        freeReward: i % 5 === 0 ? { type: 'xp', value: i * 10, description: `${i * 10} XP` } : undefined,
        premiumReward: {
          type: i % 10 === 0 ? 'tokens' : 'xp',
          value: i % 10 === 0 ? i : i * 20,
          description: i % 10 === 0 ? `${i} Tokens` : `${i * 20} XP`,
        },
      });
    }
    return tiers;
  }

  private emitEvent(event: GrowthEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGamificationEngine(
  config?: Partial<GamificationConfig>
): DefaultGamificationEngine {
  return new DefaultGamificationEngine(config);
}
