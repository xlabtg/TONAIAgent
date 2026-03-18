/**
 * TONAIAgent - Gamification Module
 *
 * Engagement features including referrals, rewards, achievements,
 * challenges, and viral growth mechanisms.
 *
 * Features:
 * - Experience and leveling system
 * - Achievements and badges
 * - Daily/weekly challenges
 * - Streak bonuses
 * - Referral program
 * - Rewards and claims
 */

import type {
  GamificationProfile,
  GamificationTier,
  Achievement,
  AchievementReward,
  Challenge,
  ChallengeRequirement,
  ChallengeReward,
  Streak,
  Reward,
  ReferralProgram,
  Referral,
  ReferralReward,
  SuperAppEvent,
  SuperAppEventCallback,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

export interface GamificationConfig {
  enabled: boolean;
  experienceMultiplier: number;
  levelExperienceBase: number;
  levelExperienceGrowth: number;
  maxLevel: number;
  referralBonusPercent: number;
  maxDailyChallenges: number;
  maxWeeklyChallenges: number;
  streakBonusEnabled: boolean;
  maxStreakMultiplier: number;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateAchievementInput {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: Achievement['category'];
  rarity: Achievement['rarity'];
  reward?: AchievementReward;
  conditions: AchievementCondition[];
}

export interface AchievementCondition {
  type: string;
  target: number;
  field?: string;
}

export interface CreateChallengeInput {
  name: string;
  description: string;
  type: Challenge['type'];
  requirements: ChallengeRequirement[];
  reward: ChallengeReward;
  durationHours: number;
}

export interface AddExperienceInput {
  userId: string;
  amount: number;
  source: string;
  description?: string;
}

export interface CreateReferralInput {
  referrerId: string;
  referredUserId: string;
  referredUserName?: string;
}

// ============================================================================
// Gamification Manager Interface
// ============================================================================

export interface GamificationManager {
  // Profile
  getProfile(userId: string): Promise<GamificationProfile>;
  createProfile(userId: string): Promise<GamificationProfile>;

  // Experience
  addExperience(input: AddExperienceInput): Promise<{ profile: GamificationProfile; leveledUp: boolean }>;
  getExperienceForLevel(level: number): number;
  getTier(level: number): GamificationTier;

  // Achievements
  getAchievements(userId: string): Promise<Achievement[]>;
  checkAchievements(userId: string, eventType: string, data: Record<string, unknown>): Promise<Achievement[]>;
  completeAchievement(userId: string, achievementId: string): Promise<Achievement>;
  getAvailableAchievements(): Achievement[];

  // Challenges
  getChallenges(userId: string): Promise<Challenge[]>;
  startChallenge(userId: string, challengeId: string): Promise<Challenge>;
  updateChallengeProgress(userId: string, challengeId: string, progress: number): Promise<Challenge>;
  completeChallenge(userId: string, challengeId: string): Promise<Challenge>;
  generateDailyChallenges(userId: string): Promise<Challenge[]>;
  generateWeeklyChallenges(userId: string): Promise<Challenge[]>;

  // Streaks
  getStreaks(userId: string): Promise<Streak[]>;
  updateStreak(userId: string, streakType: Streak['type']): Promise<Streak>;
  resetStreak(userId: string, streakType: Streak['type']): Promise<void>;

  // Rewards
  getRewards(userId: string, unclaimedOnly?: boolean): Promise<Reward[]>;
  claimReward(userId: string, rewardId: string): Promise<Reward>;
  grantReward(userId: string, reward: Omit<Reward, 'id' | 'createdAt'>): Promise<Reward>;

  // Referrals
  getReferralProgram(userId: string): Promise<ReferralProgram>;
  createReferral(input: CreateReferralInput): Promise<Referral>;
  qualifyReferral(referralId: string): Promise<Referral>;
  getReferralLink(userId: string): string;
  processReferralRewards(referralId: string): Promise<ReferralReward[]>;

  // Events
  onEvent(callback: SuperAppEventCallback): void;
}

// ============================================================================
// Default Implementation
// ============================================================================

export class DefaultGamificationManager implements GamificationManager {
  private readonly config: GamificationConfig;
  private readonly profiles = new Map<string, GamificationProfile>();
  private readonly challenges = new Map<string, Challenge>();
  private readonly userChallenges = new Map<string, string[]>();
  private readonly rewards = new Map<string, Reward>();
  private readonly userRewards = new Map<string, string[]>();
  private readonly referralPrograms = new Map<string, ReferralProgram>();
  private readonly referrals = new Map<string, Referral>();
  private readonly eventCallbacks: SuperAppEventCallback[] = [];
  private readonly achievementDefinitions: Map<string, CreateAchievementInput> = new Map();

  constructor(config: Partial<GamificationConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      experienceMultiplier: config.experienceMultiplier ?? 1.0,
      levelExperienceBase: config.levelExperienceBase ?? 100,
      levelExperienceGrowth: config.levelExperienceGrowth ?? 1.5,
      maxLevel: config.maxLevel ?? 100,
      referralBonusPercent: config.referralBonusPercent ?? 10,
      maxDailyChallenges: config.maxDailyChallenges ?? 3,
      maxWeeklyChallenges: config.maxWeeklyChallenges ?? 5,
      streakBonusEnabled: config.streakBonusEnabled ?? true,
      maxStreakMultiplier: config.maxStreakMultiplier ?? 3.0,
    };

    this.initializeAchievements();
  }

  // ============================================================================
  // Profile
  // ============================================================================

  async getProfile(userId: string): Promise<GamificationProfile> {
    let profile = this.profiles.get(userId);
    if (!profile) {
      profile = await this.createProfile(userId);
    }
    return profile;
  }

  async createProfile(userId: string): Promise<GamificationProfile> {
    const profile: GamificationProfile = {
      userId,
      level: 1,
      experience: 0,
      experienceToNextLevel: this.getExperienceForLevel(2),
      tier: 'bronze',
      achievements: [],
      challenges: [],
      streaks: this.initializeStreaks(),
      rewards: [],
      stats: {
        totalExperience: 0,
        achievementsCompleted: 0,
        challengesCompleted: 0,
        longestStreak: 0,
        totalRewardsClaimed: 0,
        rank: 0,
        rankPercentile: 0,
      },
    };

    this.profiles.set(userId, profile);
    return profile;
  }

  // ============================================================================
  // Experience
  // ============================================================================

  async addExperience(
    input: AddExperienceInput
  ): Promise<{ profile: GamificationProfile; leveledUp: boolean }> {
    const profile = await this.getProfile(input.userId);

    const adjustedAmount = Math.floor(input.amount * this.config.experienceMultiplier);
    profile.experience += adjustedAmount;
    profile.stats.totalExperience += adjustedAmount;

    let leveledUp = false;

    // Check for level up
    while (
      profile.level < this.config.maxLevel &&
      profile.experience >= profile.experienceToNextLevel
    ) {
      profile.experience -= profile.experienceToNextLevel;
      profile.level++;
      profile.experienceToNextLevel = this.getExperienceForLevel(profile.level + 1);
      profile.tier = this.getTier(profile.level);
      leveledUp = true;
    }

    this.profiles.set(input.userId, profile);

    if (leveledUp) {
      this.emitEvent({
        id: `event_${Date.now()}`,
        timestamp: new Date(),
        type: 'level_up',
        severity: 'info',
        source: 'gamification',
        userId: input.userId,
        message: `Level up! Now level ${profile.level}`,
        data: { level: profile.level, tier: profile.tier },
      });

      // Grant level up reward
      await this.grantReward(input.userId, {
        type: 'experience',
        amount: profile.level * 10,
        description: `Level ${profile.level} bonus`,
        source: 'level_up',
        claimed: false,
      });
    }

    return { profile, leveledUp };
  }

  getExperienceForLevel(level: number): number {
    return Math.floor(
      this.config.levelExperienceBase * Math.pow(this.config.levelExperienceGrowth, level - 1)
    );
  }

  getTier(level: number): GamificationTier {
    if (level >= 80) return 'legend';
    if (level >= 60) return 'diamond';
    if (level >= 40) return 'platinum';
    if (level >= 25) return 'gold';
    if (level >= 10) return 'silver';
    return 'bronze';
  }

  // ============================================================================
  // Achievements
  // ============================================================================

  async getAchievements(userId: string): Promise<Achievement[]> {
    const profile = await this.getProfile(userId);
    return profile.achievements;
  }

  async checkAchievements(
    userId: string,
    eventType: string,
    data: Record<string, unknown>
  ): Promise<Achievement[]> {
    const profile = await this.getProfile(userId);
    const completed: Achievement[] = [];

    for (const [id, def] of this.achievementDefinitions) {
      // Skip already completed achievements
      if (profile.achievements.some((a) => a.id === id && a.completed)) {
        continue;
      }

      // Check conditions
      let allConditionsMet = true;
      let totalProgress = 0;

      for (const condition of def.conditions) {
        const currentValue = this.getConditionValue(condition, eventType, data, profile);
        const progress = Math.min(100, (currentValue / condition.target) * 100);
        totalProgress += progress;

        if (currentValue < condition.target) {
          allConditionsMet = false;
        }
      }

      const avgProgress = def.conditions.length > 0 ? totalProgress / def.conditions.length : 0;

      // Update or create achievement progress
      let achievement = profile.achievements.find((a) => a.id === id);
      if (!achievement) {
        achievement = {
          ...def,
          progress: avgProgress,
          completed: false,
        };
        profile.achievements.push(achievement);
      } else {
        achievement.progress = avgProgress;
      }

      if (allConditionsMet && !achievement.completed) {
        const completedAchievement = await this.completeAchievement(userId, id);
        completed.push(completedAchievement);
      }
    }

    this.profiles.set(userId, profile);
    return completed;
  }

  async completeAchievement(userId: string, achievementId: string): Promise<Achievement> {
    const profile = await this.getProfile(userId);
    let achievement = profile.achievements.find((a) => a.id === achievementId);

    // If achievement doesn't exist in profile, create it from definition
    if (!achievement) {
      const def = this.achievementDefinitions.get(achievementId);
      if (!def) {
        throw new Error(`Achievement ${achievementId} not found`);
      }
      achievement = {
        ...def,
        progress: 100,
        completed: false,
      };
      profile.achievements.push(achievement);
    }

    if (achievement.completed) {
      return achievement;
    }

    achievement.completed = true;
    achievement.completedAt = new Date();
    achievement.progress = 100;
    profile.stats.achievementsCompleted++;

    // Grant reward
    if (achievement.reward) {
      await this.grantReward(userId, {
        type: achievement.reward.type,
        amount: achievement.reward.amount,
        description: `Achievement reward: ${achievement.name}`,
        source: `achievement_${achievementId}`,
        claimed: false,
      });
    }

    this.profiles.set(userId, profile);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'achievement_earned',
      severity: 'info',
      source: 'gamification',
      userId,
      message: `Achievement unlocked: ${achievement.name}`,
      data: { achievementId, name: achievement.name, rarity: achievement.rarity },
    });

    return achievement;
  }

  getAvailableAchievements(): Achievement[] {
    return Array.from(this.achievementDefinitions.values()).map((def) => ({
      ...def,
      progress: 0,
      completed: false,
    }));
  }

  // ============================================================================
  // Challenges
  // ============================================================================

  async getChallenges(userId: string): Promise<Challenge[]> {
    const challengeIds = this.userChallenges.get(userId) ?? [];
    const challenges: Challenge[] = [];

    for (const id of challengeIds) {
      const challenge = this.challenges.get(id);
      if (challenge) {
        challenges.push(challenge);
      }
    }

    return challenges;
  }

  async startChallenge(userId: string, challengeId: string): Promise<Challenge> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new Error(`Challenge ${challengeId} not found`);
    }

    const userChallengeIds = this.userChallenges.get(userId) ?? [];
    if (!userChallengeIds.includes(challengeId)) {
      userChallengeIds.push(challengeId);
      this.userChallenges.set(userId, userChallengeIds);
    }

    return challenge;
  }

  async updateChallengeProgress(
    userId: string,
    challengeId: string,
    progress: number
  ): Promise<Challenge> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new Error(`Challenge ${challengeId} not found`);
    }

    challenge.progress = Math.min(100, Math.max(0, progress));

    if (challenge.progress >= 100 && !challenge.completed) {
      return this.completeChallenge(userId, challengeId);
    }

    this.challenges.set(challengeId, challenge);
    return challenge;
  }

  async completeChallenge(userId: string, challengeId: string): Promise<Challenge> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new Error(`Challenge ${challengeId} not found`);
    }

    challenge.completed = true;
    challenge.progress = 100;
    this.challenges.set(challengeId, challenge);

    const profile = await this.getProfile(userId);
    profile.stats.challengesCompleted++;
    this.profiles.set(userId, profile);

    // Grant rewards
    await this.addExperience({
      userId,
      amount: challenge.reward.experience,
      source: `challenge_${challengeId}`,
      description: `Completed challenge: ${challenge.name}`,
    });

    if (challenge.reward.tokens) {
      await this.grantReward(userId, {
        type: 'tokens',
        amount: challenge.reward.tokens,
        description: `Challenge reward: ${challenge.name}`,
        source: `challenge_${challengeId}`,
        claimed: false,
      });
    }

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'challenge_completed',
      severity: 'info',
      source: 'gamification',
      userId,
      message: `Challenge completed: ${challenge.name}`,
      data: { challengeId, name: challenge.name, reward: challenge.reward },
    });

    return challenge;
  }

  async generateDailyChallenges(userId: string): Promise<Challenge[]> {
    const challenges: Challenge[] = [];
    const templates = this.getDailyChallengeTemplates();

    for (let i = 0; i < this.config.maxDailyChallenges; i++) {
      const template = templates[i % templates.length];
      const challenge = this.createChallengeFromTemplate(template, 'daily');
      this.challenges.set(challenge.id, challenge);
      challenges.push(challenge);
    }

    const userChallengeIds = this.userChallenges.get(userId) ?? [];
    userChallengeIds.push(...challenges.map((c) => c.id));
    this.userChallenges.set(userId, userChallengeIds);

    return challenges;
  }

  async generateWeeklyChallenges(userId: string): Promise<Challenge[]> {
    const challenges: Challenge[] = [];
    const templates = this.getWeeklyChallengeTemplates();

    for (let i = 0; i < this.config.maxWeeklyChallenges; i++) {
      const template = templates[i % templates.length];
      const challenge = this.createChallengeFromTemplate(template, 'weekly');
      this.challenges.set(challenge.id, challenge);
      challenges.push(challenge);
    }

    const userChallengeIds = this.userChallenges.get(userId) ?? [];
    userChallengeIds.push(...challenges.map((c) => c.id));
    this.userChallenges.set(userId, userChallengeIds);

    return challenges;
  }

  // ============================================================================
  // Streaks
  // ============================================================================

  async getStreaks(userId: string): Promise<Streak[]> {
    const profile = await this.getProfile(userId);
    return profile.streaks;
  }

  async updateStreak(userId: string, streakType: Streak['type']): Promise<Streak> {
    const profile = await this.getProfile(userId);
    const streak = profile.streaks.find((s) => s.type === streakType);

    if (!streak) {
      throw new Error(`Streak ${streakType} not found`);
    }

    const now = new Date();
    const lastActivity = new Date(streak.lastActivityAt);
    const daysSinceLastActivity = Math.floor(
      (now.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (daysSinceLastActivity === 0) {
      // Already updated today
      return streak;
    } else if (daysSinceLastActivity === 1) {
      // Consecutive day
      streak.currentCount++;
      if (streak.currentCount > streak.longestCount) {
        streak.longestCount = streak.currentCount;
        profile.stats.longestStreak = Math.max(profile.stats.longestStreak, streak.longestCount);
      }
    } else {
      // Streak broken
      streak.currentCount = 1;
    }

    streak.lastActivityAt = now;
    streak.multiplier = Math.min(
      this.config.maxStreakMultiplier,
      1 + streak.currentCount * 0.1
    );

    // Check for streak rewards
    const reward = streak.rewards.find((r) => r.day === streak.currentCount);
    if (reward) {
      await this.addExperience({
        userId,
        amount: reward.experience,
        source: `streak_${streakType}`,
        description: `${streak.currentCount} day streak bonus`,
      });

      if (reward.tokens) {
        await this.grantReward(userId, {
          type: 'tokens',
          amount: reward.tokens,
          description: `${streak.currentCount} day streak reward`,
          source: `streak_${streakType}`,
          claimed: false,
        });
      }
    }

    this.profiles.set(userId, profile);
    return streak;
  }

  async resetStreak(userId: string, streakType: Streak['type']): Promise<void> {
    const profile = await this.getProfile(userId);
    const streak = profile.streaks.find((s) => s.type === streakType);

    if (streak) {
      streak.currentCount = 0;
      streak.multiplier = 1;
      this.profiles.set(userId, profile);
    }
  }

  // ============================================================================
  // Rewards
  // ============================================================================

  async getRewards(userId: string, unclaimedOnly = false): Promise<Reward[]> {
    const rewardIds = this.userRewards.get(userId) ?? [];
    const rewards: Reward[] = [];

    for (const id of rewardIds) {
      const reward = this.rewards.get(id);
      if (reward && (!unclaimedOnly || !reward.claimed)) {
        rewards.push(reward);
      }
    }

    return rewards.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async claimReward(userId: string, rewardId: string): Promise<Reward> {
    const reward = this.rewards.get(rewardId);
    if (!reward) {
      throw new Error(`Reward ${rewardId} not found`);
    }

    if (reward.claimed) {
      throw new Error('Reward already claimed');
    }

    if (reward.expiresAt && new Date() > reward.expiresAt) {
      throw new Error('Reward has expired');
    }

    reward.claimed = true;
    reward.claimedAt = new Date();
    this.rewards.set(rewardId, reward);

    const profile = await this.getProfile(userId);
    profile.stats.totalRewardsClaimed++;
    this.profiles.set(userId, profile);

    this.emitEvent({
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'reward_claimed',
      severity: 'info',
      source: 'gamification',
      userId,
      message: `Reward claimed: ${reward.description}`,
      data: { rewardId, type: reward.type, amount: reward.amount },
    });

    return reward;
  }

  async grantReward(userId: string, reward: Omit<Reward, 'id' | 'createdAt'>): Promise<Reward> {
    const rewardId = `reward_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const fullReward: Reward = {
      ...reward,
      id: rewardId,
      createdAt: new Date(),
    };

    this.rewards.set(rewardId, fullReward);

    const userRewardIds = this.userRewards.get(userId) ?? [];
    userRewardIds.unshift(rewardId);
    this.userRewards.set(userId, userRewardIds);

    return fullReward;
  }

  // ============================================================================
  // Referrals
  // ============================================================================

  async getReferralProgram(userId: string): Promise<ReferralProgram> {
    let program = this.referralPrograms.get(userId);

    if (!program) {
      program = this.createReferralProgram(userId);
      this.referralPrograms.set(userId, program);
    }

    return program;
  }

  async createReferral(input: CreateReferralInput): Promise<Referral> {
    const program = await this.getReferralProgram(input.referrerId);

    const referralId = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const referral: Referral = {
      id: referralId,
      referredUserId: input.referredUserId,
      referredUserName: input.referredUserName,
      status: 'pending',
      joinedAt: new Date(),
      rewardsEarned: 0,
    };

    this.referrals.set(referralId, referral);
    program.referrals.push(referral);
    program.stats.totalReferrals++;

    this.referralPrograms.set(input.referrerId, program);
    return referral;
  }

  async qualifyReferral(referralId: string): Promise<Referral> {
    const referral = this.referrals.get(referralId);
    if (!referral) {
      throw new Error(`Referral ${referralId} not found`);
    }

    referral.status = 'qualified';
    referral.qualifiedAt = new Date();
    this.referrals.set(referralId, referral);

    // Update program stats
    for (const [userId, program] of this.referralPrograms) {
      const idx = program.referrals.findIndex((r) => r.id === referralId);
      if (idx >= 0) {
        program.referrals[idx] = referral;
        program.stats.qualifiedReferrals++;
        program.stats.conversionRate =
          program.stats.totalReferrals > 0
            ? program.stats.qualifiedReferrals / program.stats.totalReferrals
            : 0;

        // Process rewards
        await this.processReferralRewards(referralId);
        this.referralPrograms.set(userId, program);
        break;
      }
    }

    return referral;
  }

  getReferralLink(userId: string): string {
    return `https://t.me/TONAIAgentBot?start=ref_${userId}`;
  }

  async processReferralRewards(referralId: string): Promise<ReferralReward[]> {
    const referral = this.referrals.get(referralId);
    if (!referral) {
      throw new Error(`Referral ${referralId} not found`);
    }

    const rewards: ReferralReward[] = [];

    // Find referrer
    for (const [userId, program] of this.referralPrograms) {
      if (program.referrals.some((r) => r.id === referralId)) {
        // Signup bonus
        const signupBonus: ReferralReward = {
          id: `rr_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
          type: 'signup_bonus',
          amount: 100,
          referralId,
          status: 'approved',
          createdAt: new Date(),
        };

        rewards.push(signupBonus);
        program.rewards.push(signupBonus);
        program.stats.pendingEarnings += signupBonus.amount;

        // Grant reward to referrer
        await this.grantReward(userId, {
          type: 'tokens',
          amount: signupBonus.amount,
          description: `Referral bonus for ${referral.referredUserName ?? 'new user'}`,
          source: `referral_${referralId}`,
          claimed: false,
        });

        this.referralPrograms.set(userId, program);
        break;
      }
    }

    return rewards;
  }

  // ============================================================================
  // Events
  // ============================================================================

  onEvent(callback: SuperAppEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private initializeAchievements(): void {
    const achievements: CreateAchievementInput[] = [
      {
        id: 'first_agent',
        name: 'Agent Master',
        description: 'Deploy your first AI agent',
        icon: '🤖',
        category: 'milestone',
        rarity: 'common',
        reward: { type: 'experience', amount: 100 },
        conditions: [{ type: 'agents_deployed', target: 1 }],
      },
      {
        id: 'first_trade',
        name: 'First Steps',
        description: 'Execute your first trade',
        icon: '📈',
        category: 'trading',
        rarity: 'common',
        reward: { type: 'experience', amount: 50 },
        conditions: [{ type: 'trades_executed', target: 1 }],
      },
      {
        id: 'trader_10',
        name: 'Experienced Trader',
        description: 'Execute 10 trades',
        icon: '💹',
        category: 'trading',
        rarity: 'uncommon',
        reward: { type: 'experience', amount: 200 },
        conditions: [{ type: 'trades_executed', target: 10 }],
      },
      {
        id: 'trader_100',
        name: 'Trading Veteran',
        description: 'Execute 100 trades',
        icon: '🏆',
        category: 'trading',
        rarity: 'rare',
        reward: { type: 'experience', amount: 500 },
        conditions: [{ type: 'trades_executed', target: 100 }],
      },
      {
        id: 'profitable_week',
        name: 'Green Week',
        description: 'End the week in profit',
        icon: '💚',
        category: 'trading',
        rarity: 'uncommon',
        reward: { type: 'experience', amount: 150 },
        conditions: [{ type: 'weekly_profit', target: 1 }],
      },
      {
        id: 'referrer_5',
        name: 'Community Builder',
        description: 'Refer 5 users',
        icon: '🤝',
        category: 'social',
        rarity: 'uncommon',
        reward: { type: 'tokens', amount: 500 },
        conditions: [{ type: 'referrals', target: 5 }],
      },
      {
        id: 'streaker_7',
        name: 'Weekly Warrior',
        description: 'Maintain a 7-day streak',
        icon: '🔥',
        category: 'milestone',
        rarity: 'rare',
        reward: { type: 'experience', amount: 300 },
        conditions: [{ type: 'streak_days', target: 7 }],
      },
      {
        id: 'streaker_30',
        name: 'Monthly Master',
        description: 'Maintain a 30-day streak',
        icon: '⭐',
        category: 'milestone',
        rarity: 'epic',
        reward: { type: 'tokens', amount: 1000 },
        conditions: [{ type: 'streak_days', target: 30 }],
      },
    ];

    for (const achievement of achievements) {
      this.achievementDefinitions.set(achievement.id, achievement);
    }
  }

  private initializeStreaks(): Streak[] {
    return [
      {
        id: 'daily_login',
        type: 'daily_login',
        currentCount: 0,
        longestCount: 0,
        lastActivityAt: new Date(0),
        multiplier: 1,
        rewards: [
          { day: 3, experience: 50 },
          { day: 7, experience: 100, tokens: 10 },
          { day: 14, experience: 200, tokens: 25 },
          { day: 30, experience: 500, tokens: 100, badge: 'monthly_champion' },
        ],
      },
      {
        id: 'daily_trade',
        type: 'daily_trade',
        currentCount: 0,
        longestCount: 0,
        lastActivityAt: new Date(0),
        multiplier: 1,
        rewards: [
          { day: 5, experience: 75 },
          { day: 10, experience: 150, tokens: 20 },
        ],
      },
    ];
  }

  private createReferralProgram(userId: string): ReferralProgram {
    return {
      userId,
      referralCode: this.generateReferralCode(userId),
      referralLink: this.getReferralLink(userId),
      referrals: [],
      stats: {
        totalReferrals: 0,
        activeReferrals: 0,
        qualifiedReferrals: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
        conversionRate: 0,
      },
      rewards: [],
      tier: 'starter',
    };
  }

  private generateReferralCode(userId: string): string {
    const hash = userId.slice(-6).toUpperCase();
    return `TON${hash}`;
  }

  private getConditionValue(
    condition: AchievementCondition,
    _eventType: string,
    _data: Record<string, unknown>,
    profile: GamificationProfile
  ): number {
    switch (condition.type) {
      case 'trades_executed':
        return profile.stats.achievementsCompleted; // Placeholder
      case 'agents_deployed':
        return 0; // Would come from agent dashboard
      case 'referrals':
        const program = this.referralPrograms.get(profile.userId);
        return program?.stats.qualifiedReferrals ?? 0;
      case 'streak_days':
        const streak = profile.streaks.find((s) => s.type === 'daily_login');
        return streak?.currentCount ?? 0;
      default:
        return 0;
    }
  }

  private getDailyChallengeTemplates(): CreateChallengeInput[] {
    return [
      {
        name: 'Daily Trader',
        description: 'Execute 3 trades today',
        type: 'daily',
        requirements: [{ type: 'trades', target: 3, current: 0, description: 'Execute 3 trades' }],
        reward: { experience: 50 },
        durationHours: 24,
      },
      {
        name: 'Portfolio Check',
        description: 'Review your portfolio',
        type: 'daily',
        requirements: [
          { type: 'view_portfolio', target: 1, current: 0, description: 'View portfolio' },
        ],
        reward: { experience: 25 },
        durationHours: 24,
      },
      {
        name: 'Agent Monitor',
        description: 'Check on your AI agents',
        type: 'daily',
        requirements: [
          { type: 'view_agents', target: 1, current: 0, description: 'View agent dashboard' },
        ],
        reward: { experience: 25 },
        durationHours: 24,
      },
    ];
  }

  private getWeeklyChallengeTemplates(): CreateChallengeInput[] {
    return [
      {
        name: 'Weekly Trader',
        description: 'Execute 20 trades this week',
        type: 'weekly',
        requirements: [{ type: 'trades', target: 20, current: 0, description: 'Execute 20 trades' }],
        reward: { experience: 200, tokens: 50 },
        durationHours: 168,
      },
      {
        name: 'Profit Hunter',
        description: 'Achieve 5% portfolio growth',
        type: 'weekly',
        requirements: [
          { type: 'portfolio_growth', target: 5, current: 0, description: 'Grow portfolio by 5%' },
        ],
        reward: { experience: 300, tokens: 100 },
        durationHours: 168,
      },
    ];
  }

  private createChallengeFromTemplate(
    template: CreateChallengeInput,
    type: Challenge['type']
  ): Challenge {
    const now = new Date();
    const endsAt = new Date(now.getTime() + template.durationHours * 60 * 60 * 1000);

    return {
      id: `challenge_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      name: template.name,
      description: template.description,
      type,
      requirements: template.requirements,
      progress: 0,
      completed: false,
      reward: template.reward,
      startedAt: now,
      endsAt,
    };
  }

  private emitEvent(event: SuperAppEvent): void {
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

export function createGamificationManager(
  config?: Partial<GamificationConfig>
): DefaultGamificationManager {
  return new DefaultGamificationManager(config);
}

export default DefaultGamificationManager;
