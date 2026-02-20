/**
 * TONAIAgent - Viral Consumer Growth Engine Type Definitions
 *
 * Core types for the referral system, social trading, gamification,
 * viral loops, growth analytics, and anti-abuse mechanisms.
 */

// ============================================================================
// Referral System Types
// ============================================================================

export type ReferralStatus = 'pending' | 'active' | 'expired' | 'rewarded' | 'cancelled';

export type ReferralTier = 'standard' | 'premium' | 'elite' | 'ambassador';

export interface Referral {
  id: string;
  referrerId: string;
  refereeId: string;
  code: string;
  status: ReferralStatus;
  tier: ReferralTier;
  rewards: ReferralReward[];
  metadata: ReferralMetadata;
  createdAt: Date;
  activatedAt?: Date;
  expiredAt?: Date;
}

export interface ReferralReward {
  id: string;
  referralId: string;
  recipientId: string;
  recipientType: 'referrer' | 'referee';
  type: RewardType;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  milestone?: string;
  createdAt: Date;
  paidAt?: Date;
  txHash?: string;
}

export type RewardType =
  | 'signup_bonus'
  | 'first_trade_bonus'
  | 'volume_bonus'
  | 'milestone_bonus'
  | 'fee_discount'
  | 'token_reward'
  | 'tier_upgrade'
  | 'commission';

export interface ReferralMetadata {
  source?: string;
  campaign?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  ipCountry?: string;
  deviceType?: string;
  level: number; // Multi-level referral depth
}

export interface ReferralCode {
  code: string;
  ownerId: string;
  type: 'personal' | 'campaign' | 'influencer' | 'partnership';
  tier: ReferralTier;
  rewards: ReferralCodeRewards;
  limits: ReferralCodeLimits;
  stats: ReferralCodeStats;
  active: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

export interface ReferralCodeRewards {
  referrerBonus: number;
  refereeBonus: number;
  referrerFeeDiscount: number;
  refereeFeeDiscount: number;
  commissionPercent: number;
  tieredCommissions: TieredCommission[];
}

export interface TieredCommission {
  minReferrals: number;
  commissionPercent: number;
  bonusAmount?: number;
}

export interface ReferralCodeLimits {
  maxUses?: number;
  maxDailyUses?: number;
  minCapitalRequired?: number;
  validCountries?: string[];
  excludedCountries?: string[];
}

export interface ReferralCodeStats {
  totalUses: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalRewardsEarned: number;
  totalVolumeGenerated: number;
}

export interface ReferralTree {
  userId: string;
  level: number;
  referrer?: ReferralTreeNode;
  directReferrals: ReferralTreeNode[];
  indirectReferrals: ReferralTreeNode[];
  totalNetworkSize: number;
  totalNetworkVolume: number;
}

export interface ReferralTreeNode {
  userId: string;
  level: number;
  referralId: string;
  status: ReferralStatus;
  joinedAt: Date;
  totalVolume: number;
  commissionsGenerated: number;
}

// ============================================================================
// Social Trading Types
// ============================================================================

export type FollowStatus = 'active' | 'paused' | 'stopped';

export interface SocialFollow {
  id: string;
  followerId: string;
  followedId: string;
  type: 'user' | 'agent' | 'strategy' | 'portfolio';
  status: FollowStatus;
  notifications: FollowNotificationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowNotificationSettings {
  onTrade: boolean;
  onPerformanceMilestone: boolean;
  onStrategyUpdate: boolean;
  onNewContent: boolean;
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
}

export interface CommunityPortfolio {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  visibility: 'public' | 'private' | 'invite_only';
  type: 'curated' | 'collaborative' | 'competition';
  members: PortfolioMember[];
  allocations: PortfolioAllocation[];
  performance: PortfolioPerformance;
  rules: PortfolioRules;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioMember {
  userId: string;
  role: 'owner' | 'manager' | 'contributor' | 'follower';
  capitalContributed: number;
  joinedAt: Date;
  permissions: string[];
}

export interface PortfolioAllocation {
  strategyId?: string;
  agentId?: string;
  weight: number;
  minWeight: number;
  maxWeight: number;
  rebalanceThreshold: number;
}

export interface PortfolioPerformance {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  roi30d: number;
  roi90d: number;
  sharpeRatio: number;
  maxDrawdown: number;
  followerCount: number;
  updatedAt: Date;
}

export interface PortfolioRules {
  minInvestment: number;
  maxInvestment: number;
  lockPeriodDays: number;
  entryFee: number;
  exitFee: number;
  performanceFee: number;
  rebalanceFrequency: 'manual' | 'daily' | 'weekly' | 'monthly';
  votingEnabled: boolean;
  votingThreshold: number;
}

export interface TradingSignal {
  id: string;
  creatorId: string;
  type: 'buy' | 'sell' | 'hold' | 'alert';
  asset: string;
  confidence: number; // 0-100
  reasoning: string;
  targetPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  timeframe: string;
  visibility: 'public' | 'premium' | 'private';
  performance?: SignalPerformance;
  reactions: SignalReactions;
  createdAt: Date;
  expiresAt?: Date;
}

export interface SignalPerformance {
  actualPnl?: number;
  actualPnlPercent?: number;
  hitTarget: boolean;
  hitStopLoss: boolean;
  evaluatedAt?: Date;
}

export interface SignalReactions {
  likes: number;
  comments: number;
  shares: number;
  copies: number;
}

// ============================================================================
// Gamification Types
// ============================================================================

export interface UserProgress {
  userId: string;
  xp: number;
  level: number;
  nextLevelXp: number;
  achievements: Achievement[];
  badges: GamificationBadge[];
  streaks: Streak[];
  challenges: ChallengeProgress[];
  seasonPass?: SeasonPassProgress;
  stats: UserProgressStats;
  lastActivityAt: Date;
}

export interface UserProgressStats {
  totalTrades: number;
  totalVolume: number;
  totalProfit: number;
  referralsCompleted: number;
  challengesCompleted: number;
  achievementsUnlocked: number;
  daysActive: number;
  longestStreak: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legendary';
  xpReward: number;
  tokenReward?: number;
  iconUrl?: string;
  progress: number; // 0-100
  target: number;
  unlockedAt?: Date;
  secret: boolean;
}

export type AchievementCategory =
  | 'trading'
  | 'social'
  | 'referral'
  | 'learning'
  | 'milestone'
  | 'seasonal'
  | 'special';

export interface GamificationBadge {
  id: string;
  name: string;
  description: string;
  type: BadgeType;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  iconUrl?: string;
  earnedAt: Date;
  expiresAt?: Date;
  stats?: Record<string, number>;
}

export type BadgeType =
  | 'achievement_badge'
  | 'rank_badge'
  | 'event_badge'
  | 'community_badge'
  | 'verified_badge';

export interface Streak {
  id: string;
  userId: string;
  type: StreakType;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
  rewards: StreakReward[];
  multiplier: number;
}

export type StreakType =
  | 'daily_login'
  | 'daily_trade'
  | 'profit_streak'
  | 'referral_streak';

export interface StreakReward {
  day: number;
  xpBonus: number;
  tokenReward?: number;
  specialReward?: string;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: ChallengeType;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  requirements: ChallengeRequirement[];
  rewards: ChallengeRewards;
  participants: number;
  maxParticipants?: number;
  startDate: Date;
  endDate: Date;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
}

export type ChallengeType =
  | 'individual'
  | 'team'
  | 'global'
  | 'leaderboard'
  | 'tournament';

export interface ChallengeRequirement {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  value: number;
  description: string;
}

export interface ChallengeRewards {
  xp: number;
  tokens?: number;
  badge?: string;
  title?: string;
  prizePool?: number;
  topRewards?: TopReward[];
}

export interface TopReward {
  rank: number;
  xp: number;
  tokens: number;
  badge?: string;
  title?: string;
}

export interface ChallengeProgress {
  challengeId: string;
  userId: string;
  progress: number; // 0-100
  currentValue: number;
  targetValue: number;
  rank?: number;
  completed: boolean;
  completedAt?: Date;
  rewardsClaimed: boolean;
}

export interface Leaderboard {
  id: string;
  name: string;
  type: LeaderboardType;
  period: LeaderboardPeriod;
  category?: string;
  entries: LeaderboardEntry[];
  rewards: LeaderboardRewards;
  updatedAt: Date;
  resetsAt: Date;
}

export type LeaderboardType =
  | 'global'
  | 'regional'
  | 'category'
  | 'friends'
  | 'challenge';

export type LeaderboardPeriod =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'seasonal'
  | 'all_time';

export interface LeaderboardEntry {
  rank: number;
  previousRank?: number;
  userId: string;
  displayName: string;
  avatar?: string;
  score: number;
  change: number;
  tier?: string;
}

export interface LeaderboardRewards {
  prizes: LeaderboardPrize[];
  participationReward?: number;
  minimumParticipants: number;
}

export interface LeaderboardPrize {
  minRank: number;
  maxRank: number;
  xp: number;
  tokens?: number;
  badge?: string;
  title?: string;
}

export interface SeasonPass {
  id: string;
  name: string;
  theme: string;
  startDate: Date;
  endDate: Date;
  tiers: SeasonPassTier[];
  premiumPrice: number;
  status: 'upcoming' | 'active' | 'completed';
}

export interface SeasonPassTier {
  level: number;
  xpRequired: number;
  freeReward?: SeasonReward;
  premiumReward?: SeasonReward;
}

export interface SeasonReward {
  type: 'xp' | 'tokens' | 'badge' | 'title' | 'cosmetic' | 'feature';
  value: string | number;
  description: string;
}

export interface SeasonPassProgress {
  seasonId: string;
  userId: string;
  currentTier: number;
  currentXp: number;
  isPremium: boolean;
  claimedTiers: number[];
}

// ============================================================================
// Viral Loop Types
// ============================================================================

export interface ViralContent {
  id: string;
  type: ViralContentType;
  creatorId: string;
  entityId: string; // strategyId, agentId, etc.
  title: string;
  description: string;
  metrics: ViralMetrics;
  shareLinks: ShareLinks;
  embeddable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ViralContentType =
  | 'performance_card'
  | 'achievement_card'
  | 'leaderboard_rank'
  | 'strategy_summary'
  | 'trade_alert'
  | 'milestone'
  | 'challenge_result';

export interface ViralMetrics {
  views: number;
  uniqueViews: number;
  shares: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
  viralCoefficient: number;
  avgSharesPerUser: number;
}

export interface ShareLinks {
  directLink: string;
  telegramLink: string;
  twitterLink: string;
  embedCode?: string;
  qrCodeUrl?: string;
  shortLink?: string;
}

export interface PublicDashboard {
  id: string;
  userId: string;
  slug: string;
  title: string;
  description: string;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  theme: DashboardTheme;
  visibility: 'public' | 'unlisted' | 'private';
  stats: DashboardStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  type: 'grid' | 'list' | 'mixed';
  columns: number;
  gap: number;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: { row: number; col: number; rowSpan: number; colSpan: number };
  config: Record<string, unknown>;
  dataSource: string;
}

export type WidgetType =
  | 'performance_chart'
  | 'pnl_summary'
  | 'strategy_list'
  | 'recent_trades'
  | 'leaderboard_position'
  | 'achievements'
  | 'social_feed'
  | 'referral_stats';

export interface DashboardTheme {
  colorScheme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
}

export interface DashboardStats {
  totalViews: number;
  uniqueVisitors: number;
  avgTimeOnPage: number;
  bounceRate: number;
  conversionRate: number;
}

// ============================================================================
// Community Engagement Types
// ============================================================================

export interface CommunityEvent {
  id: string;
  name: string;
  description: string;
  type: CommunityEventType;
  organizer: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  startDate: Date;
  endDate: Date;
  participants: EventParticipant[];
  requirements: EventRequirement[];
  rewards: EventRewards;
  rules: string[];
  maxParticipants?: number;
}

export type CommunityEventType =
  | 'trading_competition'
  | 'referral_race'
  | 'social_challenge'
  | 'learning_event'
  | 'community_vote'
  | 'ama'
  | 'airdrop';

export interface EventParticipant {
  userId: string;
  joinedAt: Date;
  score: number;
  rank?: number;
  status: 'active' | 'disqualified' | 'completed';
}

export interface EventRequirement {
  type: 'kyc' | 'min_balance' | 'min_trades' | 'min_referrals' | 'premium';
  value?: number;
  description: string;
}

export interface EventRewards {
  totalPrizePool: number;
  distribution: PrizeDistribution[];
  participationReward?: number;
}

export interface PrizeDistribution {
  percentile: number; // e.g., top 1%, top 5%, etc.
  share: number; // Percentage of prize pool
}

export interface CollaborativeInvestment {
  id: string;
  name: string;
  description: string;
  type: 'syndicate' | 'club' | 'dao';
  creatorId: string;
  status: 'fundraising' | 'active' | 'divesting' | 'closed';
  members: InvestmentMember[];
  targetCapital: number;
  raisedCapital: number;
  minContribution: number;
  maxContribution: number;
  governance: InvestmentGovernance;
  performance: PortfolioPerformance;
  createdAt: Date;
  fundingDeadline: Date;
}

export interface InvestmentMember {
  userId: string;
  contribution: number;
  share: number;
  votingPower: number;
  joinedAt: Date;
  role: 'founder' | 'manager' | 'member';
}

export interface InvestmentGovernance {
  votingEnabled: boolean;
  quorum: number;
  proposalThreshold: number;
  votingPeriod: number; // in hours
  executionDelay: number; // in hours
}

// ============================================================================
// Growth Analytics Types
// ============================================================================

export interface GrowthMetrics {
  period: AnalyticsPeriod;
  acquisition: AcquisitionMetrics;
  activation: ActivationMetrics;
  retention: RetentionMetrics;
  revenue: RevenueMetrics;
  referral: ReferralMetrics;
  viral: ViralMetrics;
  engagement: EngagementMetrics;
}

export type AnalyticsPeriod = '1d' | '7d' | '30d' | '90d' | '365d' | 'all_time';

export interface AcquisitionMetrics {
  newUsers: number;
  newUsersGrowth: number;
  signupsBySource: Record<string, number>;
  signupsByChannel: Record<string, number>;
  conversionRate: number;
  costPerAcquisition: number;
}

export interface ActivationMetrics {
  activatedUsers: number;
  activationRate: number;
  timeToActivation: number; // in hours
  activationFunnel: FunnelStep[];
  dropoffPoints: DropoffPoint[];
}

export interface FunnelStep {
  name: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
}

export interface DropoffPoint {
  step: string;
  users: number;
  percentage: number;
  commonReasons: string[];
}

export interface RetentionMetrics {
  dau: number;
  wau: number;
  mau: number;
  dauMauRatio: number;
  retentionD1: number;
  retentionD7: number;
  retentionD30: number;
  cohortRetention: CohortRetention[];
  churnRate: number;
  churnPrediction: ChurnPrediction[];
}

export interface CohortRetention {
  cohort: string;
  size: number;
  retention: Record<string, number>; // day/week -> percentage
}

export interface ChurnPrediction {
  userId: string;
  churnProbability: number;
  riskFactors: string[];
  recommendedActions: string[];
}

export interface RevenueMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  arpu: number;
  arppu: number;
  ltv: number;
  revenueBySource: Record<string, number>;
  revenueByTier: Record<string, number>;
}

export interface ReferralMetrics {
  totalReferrals: number;
  successfulReferrals: number;
  referralConversionRate: number;
  avgReferralsPerUser: number;
  topReferrers: TopReferrer[];
  referralRevenueContribution: number;
  referralCostEfficiency: number;
}

export interface TopReferrer {
  userId: string;
  referralCount: number;
  conversionRate: number;
  revenueGenerated: number;
}

export interface EngagementMetrics {
  avgSessionDuration: number;
  avgSessionsPerUser: number;
  featureUsage: Record<string, number>;
  engagementScore: number;
  engagementBySegment: Record<string, number>;
}

// ============================================================================
// Incentive Optimization Types (Groq AI)
// ============================================================================

export interface IncentiveOptimization {
  id: string;
  userId: string;
  recommendations: IncentiveRecommendation[];
  predictions: IncentivePrediction[];
  personalizedOffers: PersonalizedOffer[];
  generatedAt: Date;
}

export interface IncentiveRecommendation {
  type: RewardType;
  amount: number;
  timing: string;
  channel: string;
  expectedImpact: number;
  confidence: number;
  reasoning: string;
}

export interface IncentivePrediction {
  action: string;
  probability: number;
  timeframe: string;
  influencingFactors: string[];
}

export interface PersonalizedOffer {
  id: string;
  type: string;
  title: string;
  description: string;
  value: number;
  expiresAt: Date;
  conditions: string[];
  personalizedFor: string[];
}

// ============================================================================
// Anti-Abuse Types
// ============================================================================

export type AbuseType =
  | 'sybil_attack'
  | 'referral_fraud'
  | 'reward_farming'
  | 'self_referral'
  | 'bot_activity'
  | 'collusion'
  | 'fake_volume';

export interface AbuseDetection {
  id: string;
  userId: string;
  type: AbuseType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  evidence: AbuseEvidence[];
  status: 'detected' | 'investigating' | 'confirmed' | 'dismissed';
  actions: AbuseAction[];
  detectedAt: Date;
  resolvedAt?: Date;
}

export interface AbuseEvidence {
  type: string;
  description: string;
  value: string | number;
  weight: number;
  timestamp: Date;
}

export interface AbuseAction {
  type: 'warning' | 'reward_hold' | 'reward_revoke' | 'account_restrict' | 'account_ban';
  reason: string;
  executedAt: Date;
  executedBy: string;
  reversible: boolean;
}

export interface SybilDetection {
  userId: string;
  riskScore: number; // 0-100
  signals: SybilSignal[];
  linkedAccounts: LinkedAccount[];
  recommendation: 'allow' | 'flag' | 'block';
}

export interface SybilSignal {
  type: string;
  description: string;
  weight: number;
  value: unknown;
}

export interface LinkedAccount {
  userId: string;
  linkType: 'ip' | 'device' | 'behavior' | 'referral_pattern' | 'wallet';
  confidence: number;
  sharedData: string[];
}

export interface RateLimits {
  referralsPerDay: number;
  rewardsClaimPerDay: number;
  sharesPerHour: number;
  signalsPerDay: number;
}

export interface CooldownPeriod {
  type: string;
  duration: number; // in seconds
  reason: string;
  startsAt: Date;
  endsAt: Date;
}

// ============================================================================
// Telegram Integration Types
// ============================================================================

export interface TelegramGrowth {
  botInvites: number;
  groupGrowth: number;
  channelSubscribers: number;
  activeUsers: number;
  messageEngagement: number;
  viralShares: number;
}

export interface TelegramNotification {
  id: string;
  userId: string;
  type: TelegramNotificationType;
  message: string;
  data: Record<string, unknown>;
  sent: boolean;
  sentAt?: Date;
  clickedAt?: Date;
}

export type TelegramNotificationType =
  | 'referral_joined'
  | 'reward_earned'
  | 'achievement_unlocked'
  | 'challenge_started'
  | 'leaderboard_update'
  | 'social_mention'
  | 'signal_alert';

// ============================================================================
// Configuration Types
// ============================================================================

export interface GrowthConfig {
  enabled: boolean;
  referral: ReferralConfig;
  socialTrading: SocialTradingConfig;
  gamification: GamificationConfig;
  viralLoops: ViralLoopsConfig;
  analytics: GrowthAnalyticsConfig;
  antiAbuse: AntiAbuseConfig;
  telegram: TelegramConfig;
}

export interface ReferralConfig {
  enabled: boolean;
  maxLevels: number;
  defaultReferrerBonus: number;
  defaultRefereeBonus: number;
  commissionPercent: number;
  codeExpirationDays: number;
  minCapitalForReward: number;
  cooldownHours: number;
}

export interface SocialTradingConfig {
  enabled: boolean;
  maxFollowsPerUser: number;
  signalsPremiumOnly: boolean;
  portfolioMinMembers: number;
  portfolioMaxMembers: number;
}

export interface GamificationConfig {
  enabled: boolean;
  xpMultiplier: number;
  dailyXpCap: number;
  streakBonusMultiplier: number;
  seasonPassEnabled: boolean;
}

export interface ViralLoopsConfig {
  enabled: boolean;
  publicDashboardsEnabled: boolean;
  shareableCardsEnabled: boolean;
  embedsEnabled: boolean;
  attributionWindow: number; // in days
}

export interface GrowthAnalyticsConfig {
  enabled: boolean;
  trackingEnabled: boolean;
  cohortAnalysisEnabled: boolean;
  abTestingEnabled: boolean;
  groqIncentiveOptimization: boolean;
}

export interface AntiAbuseConfig {
  enabled: boolean;
  sybilDetectionEnabled: boolean;
  fraudScoreThreshold: number;
  autoBlockThreshold: number;
  rateLimits: RateLimits;
  cooldownPeriods: Record<string, number>;
}

export interface TelegramConfig {
  enabled: boolean;
  botToken?: string;
  groupId?: string;
  channelId?: string;
  notificationsEnabled: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

export interface GrowthEvent {
  id: string;
  timestamp: Date;
  type: GrowthEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  userId?: string;
  message: string;
  data: Record<string, unknown>;
}

export type GrowthEventType =
  | 'referral_created'
  | 'referral_activated'
  | 'reward_earned'
  | 'reward_paid'
  | 'achievement_unlocked'
  | 'level_up'
  | 'challenge_completed'
  | 'leaderboard_updated'
  | 'content_shared'
  | 'content_viral'
  | 'abuse_detected'
  | 'abuse_confirmed'
  | 'user_churning'
  | 'incentive_sent';

export type GrowthEventCallback = (event: GrowthEvent) => void;
