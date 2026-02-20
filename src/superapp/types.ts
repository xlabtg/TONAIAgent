/**
 * TONAIAgent - Super App Type Definitions
 *
 * Core types for the TON Super App combining wallet, AI agents, marketplace,
 * social layer, financial dashboard, and Telegram integration.
 *
 * This module represents the "WeChat of autonomous finance" - a unified
 * platform for AI-driven wealth management on The Open Network.
 */

// ============================================================================
// Common Types
// ============================================================================

export type Currency = 'TON' | 'USDT' | 'USDC' | 'BTC' | 'ETH';

export type AssetType = 'native' | 'jetton' | 'nft' | 'staking' | 'lp_token';

export type TransactionStatus = 'pending' | 'confirming' | 'confirmed' | 'failed' | 'cancelled';

export type SecurityLevel = 'standard' | 'enhanced' | 'maximum';

// ============================================================================
// Smart Wallet Types
// ============================================================================

export type WalletType = 'standard' | 'multisig' | 'smart_contract' | 'mpc';

export type RecoveryMethod = 'seed_phrase' | 'social_recovery' | 'mpc_recovery' | 'hardware_backup';

export interface SmartWallet {
  id: string;
  address: string;
  type: WalletType;
  name: string;
  userId: string;
  balances: WalletBalance[];
  securityConfig: WalletSecurityConfig;
  recoveryConfig: WalletRecoveryConfig;
  agentIntegration: AgentWalletIntegration;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
}

export interface WalletBalance {
  asset: string;
  type: AssetType;
  amount: number;
  amountUsd: number;
  contractAddress?: string;
  decimals: number;
  metadata?: AssetMetadata;
}

export interface AssetMetadata {
  name: string;
  symbol: string;
  icon?: string;
  description?: string;
  website?: string;
  verified: boolean;
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface WalletSecurityConfig {
  level: SecurityLevel;
  biometricEnabled: boolean;
  twoFactorEnabled: boolean;
  hardwareKeyRequired: boolean;
  transactionLimits: TransactionLimits;
  whitelist: AddressWhitelist;
  autoLockMinutes: number;
  lastSecurityAudit?: Date;
}

export interface TransactionLimits {
  dailyLimit: number;
  singleTransactionLimit: number;
  requireApprovalAbove: number;
  currency: Currency;
}

export interface AddressWhitelist {
  enabled: boolean;
  addresses: WhitelistedAddress[];
  requireApprovalForNew: boolean;
}

export interface WhitelistedAddress {
  address: string;
  label: string;
  addedAt: Date;
  addedBy: string;
  verified: boolean;
}

export interface WalletRecoveryConfig {
  methods: RecoveryMethod[];
  socialRecoveryGuardians?: Guardian[];
  mpcShares?: MPCShareConfig;
  hardwareBackup?: HardwareBackupConfig;
  lastBackupAt?: Date;
  recoveryTestAt?: Date;
}

export interface Guardian {
  id: string;
  name: string;
  telegramId?: string;
  address?: string;
  status: 'pending' | 'active' | 'removed';
  addedAt: Date;
  lastVerifiedAt?: Date;
}

export interface MPCShareConfig {
  threshold: number;
  totalShares: number;
  shareLocations: ShareLocation[];
}

export interface ShareLocation {
  id: string;
  type: 'cloud' | 'device' | 'guardian';
  encrypted: boolean;
  createdAt: Date;
}

export interface HardwareBackupConfig {
  deviceType: string;
  deviceId: string;
  lastBackupAt: Date;
  verified: boolean;
}

export interface AgentWalletIntegration {
  connectedAgents: ConnectedAgent[];
  delegationRules: DelegationRule[];
  automatedTransfers: AutomatedTransfer[];
}

export interface ConnectedAgent {
  agentId: string;
  agentName: string;
  permissions: AgentWalletPermission[];
  capitalAllocated: number;
  status: 'active' | 'paused' | 'revoked';
  connectedAt: Date;
}

export interface AgentWalletPermission {
  type: 'read_balance' | 'execute_trade' | 'withdraw' | 'stake' | 'all';
  limits?: TransactionLimits;
  tokens?: string[];
  protocols?: string[];
  requiresApproval: boolean;
}

export interface DelegationRule {
  id: string;
  agentId: string;
  action: string;
  conditions: RuleCondition[];
  maxAmount: number;
  enabled: boolean;
  expiresAt?: Date;
}

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in';
  value: unknown;
}

export interface AutomatedTransfer {
  id: string;
  name: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  schedule: TransferSchedule;
  enabled: boolean;
  lastExecutedAt?: Date;
  nextExecutionAt?: Date;
}

export interface TransferSchedule {
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'on_condition';
  conditions?: RuleCondition[];
  timezone?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour?: number;
}

// ============================================================================
// Transaction Types
// ============================================================================

export type TransactionType =
  | 'transfer'
  | 'swap'
  | 'stake'
  | 'unstake'
  | 'claim'
  | 'mint'
  | 'burn'
  | 'nft_transfer'
  | 'contract_call'
  | 'agent_execution';

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: TransactionType;
  status: TransactionStatus;
  from: string;
  to: string;
  amount: number;
  currency: string;
  fee: number;
  feeCurrency: string;
  hash?: string;
  metadata: TransactionMetadata;
  confirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionMetadata {
  description?: string;
  category?: string;
  tags?: string[];
  agentId?: string;
  strategyId?: string;
  protocol?: string;
  contractAddress?: string;
  functionName?: string;
  params?: Record<string, unknown>;
  userNote?: string;
}

// ============================================================================
// Agent Dashboard Types
// ============================================================================

export interface AgentDashboard {
  userId: string;
  agents: DashboardAgent[];
  summary: AgentSummary;
  alerts: AgentAlert[];
  automations: AgentAutomation[];
  lastUpdatedAt: Date;
}

export interface DashboardAgent {
  id: string;
  name: string;
  description: string;
  strategyId: string;
  strategyName: string;
  status: AgentDashboardStatus;
  performance: AgentDashboardPerformance;
  risk: AgentRiskMetrics;
  capitalAllocated: number;
  runtimeStats: AgentRuntimeStats;
  lastActivityAt: Date;
  createdAt: Date;
}

export type AgentDashboardStatus = 'active' | 'paused' | 'stopped' | 'error' | 'initializing' | 'migrating';

export interface AgentDashboardPerformance {
  totalPnl: number;
  totalPnlPercent: number;
  todayPnl: number;
  todayPnlPercent: number;
  weeklyPnl: number;
  monthlyPnl: number;
  roi: number;
  sharpeRatio: number;
  winRate: number;
  lastTradeAt?: Date;
}

export interface AgentRiskMetrics {
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  currentDrawdown: number;
  maxDrawdown: number;
  volatility: number;
  exposureByToken: TokenExposure[];
  warnings: string[];
}

export interface TokenExposure {
  token: string;
  amount: number;
  percentage: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface AgentRuntimeStats {
  uptime: number; // in seconds
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  averageExecutionTime: number; // in ms
  lastErrorAt?: Date;
  lastError?: string;
}

export interface AgentSummary {
  totalAgents: number;
  activeAgents: number;
  totalCapitalAllocated: number;
  totalPnl: number;
  totalPnlPercent: number;
  bestPerformingAgent?: { id: string; name: string; pnlPercent: number };
  worstPerformingAgent?: { id: string; name: string; pnlPercent: number };
}

export interface AgentAlert {
  id: string;
  agentId: string;
  agentName: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  actionRequired: boolean;
  acknowledgedAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export type AlertType =
  | 'risk_threshold'
  | 'drawdown_warning'
  | 'trade_failed'
  | 'strategy_update'
  | 'performance_milestone'
  | 'capital_low'
  | 'approval_required'
  | 'system_error'
  | 'opportunity';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AgentAutomation {
  id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  enabled: boolean;
  lastTriggeredAt?: Date;
  executionCount: number;
  createdAt: Date;
}

export interface AutomationTrigger {
  type: 'schedule' | 'condition' | 'event' | 'price_alert';
  config: Record<string, unknown>;
}

export interface AutomationAction {
  type: 'pause_agent' | 'resume_agent' | 'adjust_capital' | 'send_notification' | 'execute_trade';
  config: Record<string, unknown>;
}

// ============================================================================
// Social Layer Types
// ============================================================================

export interface UserProfile {
  id: string;
  telegramId: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  verified: boolean;
  badges: UserBadge[];
  stats: UserStats;
  socialLinks: UserSocialLinks;
  privacySettings: PrivacySettings;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'achievement' | 'milestone' | 'community' | 'verified';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  earnedAt: Date;
}

export interface UserStats {
  totalPnl: number;
  totalTrades: number;
  winRate: number;
  followers: number;
  following: number;
  agentsDeployed: number;
  strategiesPublished: number;
  reputation: number;
  rank?: number;
  rankPercentile?: number;
}

export interface UserSocialLinks {
  twitter?: string;
  telegram?: string;
  discord?: string;
  website?: string;
}

export interface PrivacySettings {
  profilePublic: boolean;
  showPnl: boolean;
  showHoldings: boolean;
  showActivity: boolean;
  allowMessages: boolean;
  allowFollows: boolean;
}

export interface SocialFeed {
  userId: string;
  items: FeedItem[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface FeedItem {
  id: string;
  type: FeedItemType;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: FeedItemContent;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  createdAt: Date;
}

export type FeedItemType =
  | 'trade'
  | 'strategy_published'
  | 'agent_deployed'
  | 'milestone'
  | 'badge_earned'
  | 'comment'
  | 'tip'
  | 'analysis'
  | 'market_insight';

export interface FeedItemContent {
  title: string;
  description: string;
  media?: FeedMedia[];
  links?: FeedLink[];
  relatedStrategy?: { id: string; name: string };
  relatedAgent?: { id: string; name: string };
  metrics?: Record<string, number | string>;
}

export interface FeedMedia {
  type: 'image' | 'chart' | 'video';
  url: string;
  thumbnail?: string;
}

export interface FeedLink {
  type: 'strategy' | 'agent' | 'transaction' | 'external';
  url: string;
  label: string;
}

export interface Discussion {
  id: string;
  strategyId?: string;
  agentId?: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  tags: string[];
  pinned: boolean;
  locked: boolean;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  discussionId: string;
  parentId?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  upvotes: number;
  downvotes: number;
  replyCount: number;
  edited: boolean;
  createdAt: Date;
  editedAt?: Date;
}

export interface Leaderboard {
  id: string;
  name: string;
  type: LeaderboardType;
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  updatedAt: Date;
  nextUpdateAt: Date;
}

export type LeaderboardType =
  | 'top_performers'
  | 'most_followed'
  | 'best_agents'
  | 'rising_stars'
  | 'most_active'
  | 'top_creators';

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';

export interface LeaderboardEntry {
  rank: number;
  previousRank?: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  score: number;
  change: number;
  metrics: Record<string, number | string>;
}

// ============================================================================
// Financial Dashboard Types
// ============================================================================

export interface FinancialDashboard {
  userId: string;
  portfolio: PortfolioOverview;
  performance: PerformanceOverview;
  risk: RiskOverview;
  allocations: AllocationOverview;
  transactions: RecentTransactions;
  lastUpdatedAt: Date;
}

export interface PortfolioOverview {
  totalValueUsd: number;
  totalValueTon: number;
  change24h: number;
  change24hPercent: number;
  change7d: number;
  change7dPercent: number;
  change30d: number;
  change30dPercent: number;
  assets: PortfolioAsset[];
  topHoldings: PortfolioAsset[];
}

export interface PortfolioAsset {
  symbol: string;
  name: string;
  type: AssetType;
  amount: number;
  valueUsd: number;
  percentage: number;
  change24h: number;
  change24hPercent: number;
  icon?: string;
  contractAddress?: string;
}

export interface PerformanceOverview {
  totalPnl: number;
  totalPnlPercent: number;
  realizedPnl: number;
  unrealizedPnl: number;
  todayPnl: number;
  weeklyPnl: number;
  monthlyPnl: number;
  yearlyPnl: number;
  sharpeRatio: number;
  sortinoRatio: number;
  performanceHistory: PerformanceDataPoint[];
}

export interface PerformanceDataPoint {
  timestamp: Date;
  value: number;
  pnl: number;
  pnlPercent: number;
  benchmark?: number;
}

export interface RiskOverview {
  overallRiskLevel: 'low' | 'medium' | 'high' | 'extreme';
  riskScore: number; // 0-100
  currentDrawdown: number;
  maxDrawdown: number;
  var95: number; // Value at Risk 95%
  var99: number;
  volatility: number;
  diversificationScore: number;
  riskBreakdown: RiskBreakdownItem[];
  warnings: RiskWarning[];
}

export interface RiskBreakdownItem {
  category: string;
  score: number;
  contribution: number;
  details: string;
}

export interface RiskWarning {
  id: string;
  type: 'concentration' | 'volatility' | 'drawdown' | 'liquidity' | 'correlation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation?: string;
}

export interface AllocationOverview {
  byAsset: AllocationCategory[];
  byProtocol: AllocationCategory[];
  byRiskLevel: AllocationCategory[];
  byStrategy: AllocationCategory[];
  recommendations: AllocationRecommendation[];
}

export interface AllocationCategory {
  name: string;
  value: number;
  percentage: number;
  change24h: number;
  color?: string;
}

export interface AllocationRecommendation {
  type: 'rebalance' | 'diversify' | 'reduce_risk' | 'increase_allocation';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  suggestedAction: string;
}

export interface RecentTransactions {
  items: TransactionSummary[];
  totalCount: number;
  hasMore: boolean;
}

export interface TransactionSummary {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  amount: number;
  currency: string;
  valueUsd: number;
  timestamp: Date;
  agentName?: string;
  strategyName?: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface NotificationSettings {
  userId: string;
  channels: NotificationChannels;
  categories: NotificationCategories;
  quietHours: QuietHours;
  frequency: NotificationFrequency;
}

export interface NotificationChannels {
  telegram: boolean;
  push: boolean;
  email?: boolean;
  sms?: boolean;
}

export interface NotificationCategories {
  trades: boolean;
  alerts: boolean;
  riskWarnings: boolean;
  performance: boolean;
  social: boolean;
  promotions: boolean;
  systemUpdates: boolean;
}

export interface QuietHours {
  enabled: boolean;
  startTime: string; // HH:mm
  endTime: string;
  timezone: string;
  exceptCritical: boolean;
}

export interface NotificationFrequency {
  instantCritical: boolean;
  batchNonCritical: boolean;
  batchIntervalMinutes: number;
  digestEnabled: boolean;
  digestTime: string; // HH:mm
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  severity: AlertSeverity;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  action?: NotificationAction;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export type NotificationType =
  | 'trade_executed'
  | 'trade_failed'
  | 'risk_alert'
  | 'price_alert'
  | 'drawdown_warning'
  | 'performance_update'
  | 'agent_status'
  | 'social_activity'
  | 'system_announcement'
  | 'approval_required'
  | 'opportunity';

export interface NotificationAction {
  type: 'open_agent' | 'open_trade' | 'approve' | 'dismiss' | 'custom';
  label: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Telegram Integration Types
// ============================================================================

export interface TelegramIntegration {
  userId: string;
  telegramUserId: number;
  chatId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  verified: boolean;
  linkedAt: Date;
  lastInteractionAt: Date;
  miniAppOpened: boolean;
  botInteractions: number;
}

export interface MiniAppContext {
  userId: string;
  telegramUserId: number;
  startParam?: string;
  initData: TelegramInitData;
  themeParams: TelegramThemeParams;
  colorScheme: 'light' | 'dark';
  platform: 'android' | 'ios' | 'web' | 'macos' | 'windows';
  version: string;
}

export interface TelegramInitData {
  queryId: string;
  user: TelegramUser;
  authDate: number;
  hash: string;
}

export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
  photoUrl?: string;
}

export interface TelegramThemeParams {
  bgColor: string;
  textColor: string;
  hintColor: string;
  linkColor: string;
  buttonColor: string;
  buttonTextColor: string;
  secondaryBgColor: string;
}

export interface BotCommand {
  command: string;
  description: string;
  handler: string;
  requiresAuth: boolean;
  adminOnly: boolean;
}

// ============================================================================
// Gamification Types
// ============================================================================

export interface GamificationProfile {
  userId: string;
  level: number;
  experience: number;
  experienceToNextLevel: number;
  tier: GamificationTier;
  achievements: Achievement[];
  challenges: Challenge[];
  streaks: Streak[];
  rewards: Reward[];
  stats: GamificationStats;
}

export type GamificationTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legend';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'trading' | 'social' | 'learning' | 'milestone' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  progress: number; // 0-100
  completed: boolean;
  completedAt?: Date;
  reward?: AchievementReward;
}

export interface AchievementReward {
  type: 'experience' | 'tokens' | 'badge' | 'feature_unlock';
  amount?: number;
  data?: Record<string, unknown>;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  requirements: ChallengeRequirement[];
  progress: number;
  completed: boolean;
  reward: ChallengeReward;
  startedAt: Date;
  endsAt: Date;
}

export interface ChallengeRequirement {
  type: string;
  target: number;
  current: number;
  description: string;
}

export interface ChallengeReward {
  experience: number;
  tokens?: number;
  badge?: string;
  multiplier?: number;
}

export interface Streak {
  id: string;
  type: 'daily_login' | 'daily_trade' | 'daily_profit' | 'weekly_active';
  currentCount: number;
  longestCount: number;
  lastActivityAt: Date;
  multiplier: number;
  rewards: StreakReward[];
}

export interface StreakReward {
  day: number;
  experience: number;
  tokens?: number;
  badge?: string;
}

export interface Reward {
  id: string;
  type: 'experience' | 'tokens' | 'badge' | 'feature_unlock' | 'discount';
  amount?: number;
  description: string;
  source: string;
  claimed: boolean;
  claimedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface GamificationStats {
  totalExperience: number;
  achievementsCompleted: number;
  challengesCompleted: number;
  longestStreak: number;
  totalRewardsClaimed: number;
  rank: number;
  rankPercentile: number;
}

export interface ReferralProgram {
  userId: string;
  referralCode: string;
  referralLink: string;
  referrals: Referral[];
  stats: ReferralStats;
  rewards: ReferralReward[];
  tier: ReferralTier;
}

export interface Referral {
  id: string;
  referredUserId: string;
  referredUserName?: string;
  status: 'pending' | 'active' | 'qualified' | 'expired';
  joinedAt: Date;
  qualifiedAt?: Date;
  rewardsEarned: number;
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  qualifiedReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  conversionRate: number;
}

export interface ReferralReward {
  id: string;
  type: 'signup_bonus' | 'trade_commission' | 'milestone_bonus';
  amount: number;
  referralId?: string;
  status: 'pending' | 'approved' | 'paid';
  createdAt: Date;
  paidAt?: Date;
}

export type ReferralTier = 'starter' | 'affiliate' | 'partner' | 'ambassador';

// ============================================================================
// AI Assistant Types
// ============================================================================

export interface AIAssistant {
  userId: string;
  sessionId: string;
  context: AIAssistantContext;
  capabilities: AIAssistantCapability[];
  conversationHistory: AIMessage[];
  preferences: AIAssistantPreferences;
}

export interface AIAssistantContext {
  currentWallet?: string;
  currentAgent?: string;
  currentStrategy?: string;
  recentActivity: string[];
  userIntent?: string;
  portfolioSummary?: Record<string, unknown>;
}

export type AIAssistantCapability =
  | 'portfolio_advice'
  | 'strategy_suggestions'
  | 'risk_guidance'
  | 'market_analysis'
  | 'agent_management'
  | 'trade_execution'
  | 'educational_content';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: AIMessageMetadata;
}

export interface AIMessageMetadata {
  intent?: string;
  confidence?: number;
  suggestions?: string[];
  actions?: AIAction[];
  sources?: AISource[];
}

export interface AIAction {
  type: string;
  label: string;
  data: Record<string, unknown>;
  requiresConfirmation: boolean;
}

export interface AISource {
  type: 'market_data' | 'portfolio' | 'strategy' | 'documentation';
  reference: string;
  confidence: number;
}

export interface AIAssistantPreferences {
  personalityStyle: 'professional' | 'friendly' | 'concise';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  detailLevel: 'basic' | 'intermediate' | 'advanced';
  autoSuggestions: boolean;
  proactiveAlerts: boolean;
}

// ============================================================================
// Monetization Types (Super App specific)
// ============================================================================

export interface SuperAppSubscription {
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  features: SubscriptionFeature[];
  billing: BillingInfo;
  startedAt: Date;
  expiresAt?: Date;
  cancelledAt?: Date;
}

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';

export type SubscriptionStatus = 'active' | 'trial' | 'past_due' | 'cancelled' | 'expired';

export interface SubscriptionFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  limit?: number;
  used?: number;
}

export interface BillingInfo {
  method: 'ton' | 'jetton' | 'subscription_nft';
  amount: number;
  currency: string;
  frequency: 'monthly' | 'yearly';
  nextBillingDate?: Date;
  autoRenew: boolean;
}

export interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  category: 'agents' | 'analytics' | 'social' | 'support';
  requiredTier: SubscriptionTier;
  price?: FeaturePrice;
}

export interface FeaturePrice {
  amount: number;
  currency: string;
  type: 'one_time' | 'monthly' | 'per_use';
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface SuperAppConfig {
  enabled: boolean;
  wallet: WalletConfig;
  agentDashboard: AgentDashboardConfig;
  social: SocialConfig;
  financial: FinancialConfig;
  notifications: NotificationsConfig;
  telegram: TelegramConfig;
  gamification: GamificationConfig;
  aiAssistant: AIAssistantConfig;
  monetization: SuperAppMonetizationConfig;
}

export interface WalletConfig {
  supportedAssets: string[];
  supportedProtocols: string[];
  defaultSecurityLevel: SecurityLevel;
  recoveryMethodsEnabled: RecoveryMethod[];
  transactionLimits: TransactionLimits;
}

export interface AgentDashboardConfig {
  maxAgentsPerUser: number;
  defaultAlertSettings: Record<AlertType, AlertSeverity>;
  automationEnabled: boolean;
  maxAutomationsPerUser: number;
}

export interface SocialConfig {
  profilesEnabled: boolean;
  feedEnabled: boolean;
  discussionsEnabled: boolean;
  leaderboardsEnabled: boolean;
  maxFollowersPerUser: number;
  contentModerationEnabled: boolean;
}

export interface FinancialConfig {
  baseCurrency: Currency;
  supportedCurrencies: Currency[];
  priceUpdateIntervalMs: number;
  performanceHistoryDays: number;
  riskCalculationMethod: 'historical' | 'parametric' | 'monte_carlo';
}

export interface NotificationsConfig {
  channels: NotificationChannels;
  defaultCategories: NotificationCategories;
  rateLimitPerMinute: number;
  batchIntervalMs: number;
}

export interface TelegramConfig {
  botToken: string;
  miniAppUrl: string;
  webhookUrl?: string;
  commands: BotCommand[];
}

export interface GamificationConfig {
  enabled: boolean;
  experienceMultiplier: number;
  referralBonusPercent: number;
  maxDailyChallenges: number;
  streakBonusEnabled: boolean;
}

export interface AIAssistantConfig {
  enabled: boolean;
  defaultProvider: 'groq' | 'anthropic' | 'openai';
  maxConversationHistory: number;
  capabilities: AIAssistantCapability[];
  autoSuggestionsEnabled: boolean;
}

export interface SuperAppMonetizationConfig {
  subscriptionsEnabled: boolean;
  tiers: SubscriptionTierConfig[];
  premiumFeatures: PremiumFeature[];
  freeTrialDays: number;
}

export interface SubscriptionTierConfig {
  tier: SubscriptionTier;
  name: string;
  price: number;
  currency: string;
  features: string[];
  limits: Record<string, number>;
}

// ============================================================================
// Event Types
// ============================================================================

export interface SuperAppEvent {
  id: string;
  timestamp: Date;
  type: SuperAppEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  userId?: string;
  message: string;
  data: Record<string, unknown>;
}

export type SuperAppEventType =
  // Wallet events
  | 'wallet_created'
  | 'wallet_connected'
  | 'transaction_sent'
  | 'transaction_confirmed'
  | 'transaction_failed'
  // Agent events
  | 'agent_deployed'
  | 'agent_paused'
  | 'agent_resumed'
  | 'agent_stopped'
  | 'agent_error'
  // Social events
  | 'profile_updated'
  | 'user_followed'
  | 'content_posted'
  | 'discussion_created'
  // Financial events
  | 'portfolio_updated'
  | 'risk_alert'
  | 'performance_milestone'
  // Notification events
  | 'notification_sent'
  | 'notification_read'
  // Gamification events
  | 'achievement_earned'
  | 'challenge_completed'
  | 'level_up'
  | 'reward_claimed'
  // Subscription events
  | 'subscription_started'
  | 'subscription_renewed'
  | 'subscription_cancelled';

export type SuperAppEventCallback = (event: SuperAppEvent) => void;
