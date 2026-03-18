/**
 * TONAIAgent - MVP Types
 *
 * Type definitions for the MVP (Minimum Viable Product) module that integrates
 * Telegram Mini App, Strategy Marketplace, Agent Rankings, and Go-To-Market features.
 */

// ============================================================================
// MVP Configuration
// ============================================================================

/**
 * Main MVP configuration
 */
export interface MVPConfig {
  /** Enable/disable MVP features */
  enabled: boolean;
  /** Telegram Mini App configuration */
  telegramApp: TelegramAppConfig;
  /** Strategy Marketplace configuration */
  marketplace: MarketplaceConfig;
  /** Agent Ranking configuration */
  ranking: RankingConfig;
  /** Admin Dashboard configuration */
  admin: AdminConfig;
  /** Revenue configuration */
  revenue: RevenueConfig;
  /** Growth configuration */
  growth: GrowthConfig;
  /** Privacy configuration */
  privacy: PrivacyConfig;
  /** Localization configuration */
  localization: LocalizationConfig;
}

// ============================================================================
// Telegram Mini App Types
// ============================================================================

/**
 * Telegram Mini App configuration
 */
export interface TelegramAppConfig {
  /** Bot token */
  botToken?: string;
  /** Mini App URL */
  miniAppUrl?: string;
  /** Webhook URL */
  webhookUrl?: string;
  /** Enable fast onboarding */
  fastOnboarding: boolean;
  /** Mobile-first UX */
  mobileFirst: boolean;
  /** Non-custodial mode */
  nonCustodial: boolean;
  /** AI-assisted features */
  aiAssisted: boolean;
  /** External web dashboard URL */
  webDashboardUrl?: string;
}

/**
 * User profile for Telegram users
 */
export interface TelegramUser {
  /** Telegram user ID */
  telegramId: string;
  /** Username */
  username?: string;
  /** First name */
  firstName?: string;
  /** Last name */
  lastName?: string;
  /** Language code */
  languageCode: string;
  /** Profile photo URL */
  photoUrl?: string;
  /** Is premium user */
  isPremium: boolean;
  /** Registration date */
  createdAt: Date;
  /** Last activity */
  lastActiveAt: Date;
}

/**
 * User wallet in the app
 */
export interface UserWallet {
  /** Wallet ID */
  id: string;
  /** User ID */
  userId: string;
  /** Wallet address */
  address: string;
  /** Wallet type */
  type: 'ton_connect' | 'mpc' | 'smart_contract';
  /** Balance in TON */
  balanceTon: number;
  /** Balance in USD */
  balanceUsd: number;
  /** Connected jettons */
  jettons: JettonBalance[];
  /** Creation date */
  createdAt: Date;
}

/**
 * Jetton balance
 */
export interface JettonBalance {
  /** Jetton symbol */
  symbol: string;
  /** Jetton name */
  name: string;
  /** Contract address */
  address: string;
  /** Balance */
  balance: number;
  /** USD value */
  valueUsd: number;
  /** Logo URL */
  logoUrl?: string;
}

/**
 * User portfolio overview
 */
export interface UserPortfolio {
  /** User ID */
  userId: string;
  /** Total value in USD */
  totalValueUsd: number;
  /** Total value in TON */
  totalValueTon: number;
  /** Active agents count */
  activeAgents: number;
  /** Total yield earned */
  totalYieldEarned: number;
  /** 24h change percentage */
  change24h: number;
  /** 7d change percentage */
  change7d: number;
  /** Risk level */
  riskLevel: RiskLevel;
  /** Asset allocation */
  allocation: AssetAllocation[];
  /** Last updated */
  updatedAt: Date;
}

/**
 * Asset allocation entry
 */
export interface AssetAllocation {
  /** Asset symbol */
  symbol: string;
  /** Asset name */
  name: string;
  /** Percentage of portfolio */
  percentage: number;
  /** Value in USD */
  valueUsd: number;
}

/**
 * Risk level enum
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'very_high';

// ============================================================================
// Agent Types
// ============================================================================

/**
 * Agent goal for creation flow
 */
export type AgentGoal =
  | 'passive_income'
  | 'trading'
  | 'dca'
  | 'liquidity'
  | 'yield_farming'
  | 'rebalancing'
  | 'arbitrage';

/**
 * Agent creation input
 */
export interface CreateAgentInput {
  /** User ID */
  userId: string;
  /** Agent name */
  name: string;
  /** Agent goal */
  goal: AgentGoal;
  /** Strategy ID to use */
  strategyId: string;
  /** Initial capital */
  capital: number;
  /** Risk tolerance */
  riskTolerance: RiskLevel;
  /** Auto-compound earnings */
  autoCompound: boolean;
}

/**
 * User agent
 */
export interface UserAgent {
  /** Agent ID */
  id: string;
  /** User ID */
  userId: string;
  /** Agent name */
  name: string;
  /** Agent goal */
  goal: AgentGoal;
  /** Strategy ID */
  strategyId: string;
  /** Strategy name */
  strategyName: string;
  /** Agent status */
  status: AgentStatus;
  /** Allocated capital */
  capitalAllocated: number;
  /** Current value */
  currentValue: number;
  /** Total profit/loss */
  pnl: number;
  /** APY */
  apy: number;
  /** Risk level */
  riskLevel: RiskLevel;
  /** Creation date */
  createdAt: Date;
  /** Last execution */
  lastExecutionAt?: Date;
}

/**
 * Agent status
 */
export type AgentStatus =
  | 'pending'
  | 'active'
  | 'paused'
  | 'stopped'
  | 'error';

/**
 * Agent performance metrics
 */
export interface AgentPerformance {
  /** Agent ID */
  agentId: string;
  /** Period */
  period: '24h' | '7d' | '30d' | 'all';
  /** Total return percentage */
  totalReturn: number;
  /** Win rate percentage */
  winRate: number;
  /** Total trades */
  totalTrades: number;
  /** Profitable trades */
  profitableTrades: number;
  /** Max drawdown */
  maxDrawdown: number;
  /** Sharpe ratio */
  sharpeRatio: number;
  /** Average trade profit */
  avgTradeProfit: number;
}

// ============================================================================
// Strategy Marketplace Types
// ============================================================================

/**
 * Marketplace configuration
 */
export interface MarketplaceConfig {
  /** Enable marketplace */
  enabled: boolean;
  /** Minimum score for listing */
  minScoreForListing: number;
  /** Enable copy trading */
  copyTradingEnabled: boolean;
  /** Minimum copy amount */
  minCopyAmount: number;
  /** Maximum copy amount */
  maxCopyAmount: number;
  /** Default slippage protection */
  defaultSlippageProtection: number;
  /** Maximum followers per agent */
  maxFollowersPerAgent: number;
}

/**
 * Strategy category
 */
export type StrategyCategory =
  | 'dca'
  | 'yield_farming'
  | 'liquidity'
  | 'rebalancing'
  | 'arbitrage'
  | 'trading'
  | 'custom';

/**
 * Marketplace strategy listing
 */
export interface StrategyListing {
  /** Strategy ID */
  id: string;
  /** Strategy name */
  name: string;
  /** Description */
  description: string;
  /** Category */
  category: StrategyCategory;
  /** Creator ID */
  creatorId: string;
  /** Creator username */
  creatorUsername: string;
  /** Creator reputation score */
  creatorReputation: number;
  /** Strategy risk level */
  riskLevel: RiskLevel;
  /** Historical APY */
  apy: number;
  /** Total value locked */
  tvl: number;
  /** Number of copiers */
  copiers: number;
  /** Rating (0-5) */
  rating: number;
  /** Number of ratings */
  ratingCount: number;
  /** Minimum investment */
  minInvestment: number;
  /** Performance fee percentage */
  performanceFee: number;
  /** Management fee percentage */
  managementFee: number;
  /** Is featured */
  isFeatured: boolean;
  /** Tags */
  tags: string[];
  /** Creation date */
  createdAt: Date;
  /** Last updated */
  updatedAt: Date;
}

/**
 * Strategy filter options
 */
export interface StrategyFilter {
  /** Filter by category */
  category?: StrategyCategory;
  /** Filter by risk level */
  riskLevel?: RiskLevel;
  /** Minimum APY */
  minApy?: number;
  /** Maximum APY */
  maxApy?: number;
  /** Minimum TVL */
  minTvl?: number;
  /** Minimum rating */
  minRating?: number;
  /** Maximum performance fee */
  maxPerformanceFee?: number;
  /** Sort by field */
  sortBy?: 'apy' | 'tvl' | 'copiers' | 'rating' | 'createdAt';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
  /** Page number */
  page?: number;
  /** Page size */
  pageSize?: number;
}

/**
 * Copy trading position
 */
export interface CopyPosition {
  /** Position ID */
  id: string;
  /** User ID */
  userId: string;
  /** Strategy ID */
  strategyId: string;
  /** Agent ID */
  agentId: string;
  /** Allocated capital */
  capitalAllocated: number;
  /** Current value */
  currentValue: number;
  /** PnL */
  pnl: number;
  /** Status */
  status: 'active' | 'paused' | 'stopped';
  /** Start date */
  startedAt: Date;
  /** Last sync */
  lastSyncAt: Date;
}

// ============================================================================
// Creator Types
// ============================================================================

/**
 * Strategy creator profile
 */
export interface CreatorProfile {
  /** User ID */
  userId: string;
  /** Display name */
  displayName: string;
  /** Username */
  username: string;
  /** Bio */
  bio?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Verification status */
  isVerified: boolean;
  /** Total strategies */
  totalStrategies: number;
  /** Total copiers */
  totalCopiers: number;
  /** Total TVL */
  totalTvl: number;
  /** Average APY */
  avgApy: number;
  /** Reputation score */
  reputationScore: number;
  /** Reputation tier */
  reputationTier: ReputationTier;
  /** Total earnings */
  totalEarnings: number;
  /** Join date */
  joinedAt: Date;
}

/**
 * Reputation tier
 */
export type ReputationTier =
  | 'newcomer'
  | 'rising'
  | 'established'
  | 'expert'
  | 'master'
  | 'legend';

/**
 * Creator earnings breakdown
 */
export interface CreatorEarnings {
  /** Creator ID */
  creatorId: string;
  /** Period */
  period: '24h' | '7d' | '30d' | 'all';
  /** Performance fees earned */
  performanceFees: number;
  /** Management fees earned */
  managementFees: number;
  /** Subscription revenue */
  subscriptionRevenue: number;
  /** Referral earnings */
  referralEarnings: number;
  /** Total earnings */
  totalEarnings: number;
  /** Pending payout */
  pendingPayout: number;
}

// ============================================================================
// Agent Ranking Types
// ============================================================================

/**
 * Ranking configuration
 */
export interface RankingConfig {
  /** Enable ranking system */
  enabled: boolean;
  /** Update frequency in minutes */
  updateFrequencyMinutes: number;
  /** Performance weight (0-1) */
  performanceWeight: number;
  /** Stability weight (0-1) */
  stabilityWeight: number;
  /** Risk weight (0-1) */
  riskWeight: number;
  /** Reputation weight (0-1) */
  reputationWeight: number;
  /** On-chain behavior weight (0-1) */
  onChainWeight: number;
  /** Minimum history days for ranking */
  minHistoryDays: number;
  /** Use Telegram signals */
  useTelegramSignals: boolean;
}

/**
 * Agent ranking entry
 */
export interface AgentRanking {
  /** Rank position */
  rank: number;
  /** Agent ID */
  agentId: string;
  /** Agent name */
  agentName: string;
  /** Strategy name */
  strategyName: string;
  /** Owner username */
  ownerUsername: string;
  /** Composite score (0-100) */
  score: number;
  /** Performance score */
  performanceScore: number;
  /** Stability score */
  stabilityScore: number;
  /** Risk score */
  riskScore: number;
  /** Reputation score */
  reputationScore: number;
  /** On-chain score */
  onChainScore: number;
  /** APY */
  apy: number;
  /** TVL */
  tvl: number;
  /** Max drawdown */
  maxDrawdown: number;
  /** Uptime percentage */
  uptime: number;
  /** Rank change (positive = improved) */
  rankChange: number;
  /** Last updated */
  updatedAt: Date;
}

/**
 * Ranking factor scores
 */
export interface RankingFactors {
  /** Performance factors */
  performance: {
    apy: number;
    riskAdjustedReturns: number;
    maxDrawdown: number;
    winRate: number;
  };
  /** Stability factors */
  stability: {
    uptime: number;
    volatility: number;
    consistency: number;
  };
  /** Risk factors */
  risk: {
    exposure: number;
    leverage: number;
    concentration: number;
  };
  /** Reputation factors */
  reputation: {
    communityFeedback: number;
    usage: number;
    history: number;
  };
  /** On-chain factors */
  onChain: {
    executionQuality: number;
    gasEfficiency: number;
    contractSecurity: number;
  };
}

/**
 * Telegram signals for ranking (requires consent)
 */
export interface TelegramSignals {
  /** User engagement score */
  engagement: number;
  /** Activity level */
  activity: number;
  /** Social trust score */
  socialTrust: number;
  /** Community participation */
  communityParticipation: number;
  /** Has consented to signals */
  hasConsented: boolean;
}

// ============================================================================
// Admin Dashboard Types
// ============================================================================

/**
 * Admin dashboard configuration
 */
export interface AdminConfig {
  /** Enable admin dashboard */
  enabled: boolean;
  /** Enable risk control */
  riskControl: boolean;
  /** Enable emergency controls */
  emergencyControls: boolean;
  /** Enable fraud detection */
  fraudDetection: boolean;
  /** Enable KYC flags */
  kycFlags: boolean;
  /** Enable strategy moderation */
  strategyModeration: boolean;
  /** Enable blocking */
  blockingEnabled: boolean;
  /** Enable reporting */
  reportingEnabled: boolean;
}

/**
 * Admin role
 */
export type AdminRole =
  | 'viewer'
  | 'operator'
  | 'admin'
  | 'superadmin';

/**
 * Admin permissions
 */
export interface AdminPermissions {
  /** Can view users */
  viewUsers: boolean;
  /** Can view agents */
  viewAgents: boolean;
  /** Can view metrics */
  viewMetrics: boolean;
  /** Can pause agents */
  pauseAgents: boolean;
  /** Can view logs */
  viewLogs: boolean;
  /** Can manage users */
  manageUsers: boolean;
  /** Can manage agents */
  manageAgents: boolean;
  /** Can manage admins */
  manageAdmins: boolean;
  /** Can trigger emergency actions */
  emergencyActions: boolean;
}

/**
 * System metrics for admin dashboard
 */
export interface SystemMetrics {
  /** Total users */
  totalUsers: number;
  /** Daily active users */
  dau: number;
  /** Monthly active users */
  mau: number;
  /** Total agents */
  totalAgents: number;
  /** Active agents */
  activeAgents: number;
  /** Total TVL in USD */
  tvlUsd: number;
  /** 24h volume */
  volume24h: number;
  /** Total strategies */
  totalStrategies: number;
  /** Active strategies */
  activeStrategies: number;
  /** Revenue 24h */
  revenue24h: number;
  /** Revenue 30d */
  revenue30d: number;
  /** New users 24h */
  newUsers24h: number;
  /** New agents 24h */
  newAgents24h: number;
  /** System health */
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
  /** Last updated */
  updatedAt: Date;
}

/**
 * Risk alert for admin
 */
export interface RiskAlert {
  /** Alert ID */
  id: string;
  /** Alert type */
  type: 'agent_risk' | 'user_risk' | 'system_risk' | 'fraud' | 'kyc';
  /** Severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Title */
  title: string;
  /** Description */
  description: string;
  /** Affected entity ID */
  entityId: string;
  /** Affected entity type */
  entityType: 'user' | 'agent' | 'strategy' | 'system';
  /** Recommended action */
  recommendedAction?: string;
  /** Is resolved */
  isResolved: boolean;
  /** Resolved by */
  resolvedBy?: string;
  /** Resolution notes */
  resolutionNotes?: string;
  /** Created at */
  createdAt: Date;
  /** Resolved at */
  resolvedAt?: Date;
}

/**
 * Moderation action
 */
export interface ModerationAction {
  /** Action ID */
  id: string;
  /** Action type */
  type: 'warn' | 'pause' | 'block' | 'unblock' | 'verify' | 'flag';
  /** Target entity ID */
  targetId: string;
  /** Target entity type */
  targetType: 'user' | 'agent' | 'strategy';
  /** Reason */
  reason: string;
  /** Performed by */
  performedBy: string;
  /** Performed at */
  performedAt: Date;
  /** Expires at (for temporary actions) */
  expiresAt?: Date;
  /** Additional data */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Revenue Types
// ============================================================================

/**
 * Revenue configuration
 */
export interface RevenueConfig {
  /** Enable revenue features */
  enabled: boolean;
  /** Default performance fee percentage */
  defaultPerformanceFee: number;
  /** Maximum performance fee percentage */
  maxPerformanceFee: number;
  /** Platform fee percentage */
  platformFee: number;
  /** Enable premium AI features */
  premiumAiEnabled: boolean;
  /** Premium AI price per month */
  premiumAiPrice: number;
  /** Creator revenue share percentage */
  creatorRevenueShare: number;
  /** Payout threshold */
  payoutThreshold: number;
  /** Payout frequency */
  payoutFrequency: 'daily' | 'weekly' | 'monthly';
}

/**
 * Platform revenue metrics
 */
export interface RevenueMetrics {
  /** Period */
  period: '24h' | '7d' | '30d' | 'all';
  /** Total performance fees collected */
  performanceFees: number;
  /** Total management fees collected */
  managementFees: number;
  /** Total platform fees */
  platformFees: number;
  /** Premium subscription revenue */
  premiumRevenue: number;
  /** Total revenue */
  totalRevenue: number;
  /** Revenue growth percentage */
  revenueGrowth: number;
  /** Average revenue per user */
  arpu: number;
  /** Lifetime value */
  ltv: number;
}

/**
 * Premium subscription
 */
export interface PremiumSubscription {
  /** Subscription ID */
  id: string;
  /** User ID */
  userId: string;
  /** Tier */
  tier: 'basic' | 'pro' | 'institutional';
  /** Status */
  status: 'active' | 'canceled' | 'expired';
  /** Start date */
  startedAt: Date;
  /** End date */
  endsAt: Date;
  /** Price paid */
  pricePaid: number;
  /** Features included */
  features: string[];
  /** Auto-renew */
  autoRenew: boolean;
}

// ============================================================================
// Growth Types
// ============================================================================

/**
 * Growth configuration
 */
export interface GrowthConfig {
  /** Enable growth features */
  enabled: boolean;
  /** Enable referrals */
  referralsEnabled: boolean;
  /** Referral commission percentage */
  referralCommission: number;
  /** Maximum referral levels */
  maxReferralLevels: number;
  /** Enable strategy sharing */
  strategySharing: boolean;
  /** Enable social trading */
  socialTrading: boolean;
  /** Enable gamification */
  gamification: boolean;
}

/**
 * Referral info
 */
export interface ReferralInfo {
  /** User ID */
  userId: string;
  /** Referral code */
  referralCode: string;
  /** Total referrals */
  totalReferrals: number;
  /** Active referrals */
  activeReferrals: number;
  /** Total earnings from referrals */
  totalEarnings: number;
  /** Pending earnings */
  pendingEarnings: number;
  /** Referral tier */
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

// ============================================================================
// Privacy Types
// ============================================================================

/**
 * Privacy configuration
 */
export interface PrivacyConfig {
  /** Require explicit consent for data tracking */
  requireConsent: boolean;
  /** Require explicit consent for performance sharing */
  requirePerformanceConsent: boolean;
  /** Data retention days */
  dataRetentionDays: number;
  /** Allow anonymous mode */
  allowAnonymous: boolean;
}

/**
 * User consent record
 */
export interface UserConsent {
  /** User ID */
  userId: string;
  /** Data tracking consent */
  dataTracking: boolean;
  /** Performance sharing consent */
  performanceSharing: boolean;
  /** Telegram signals consent */
  telegramSignals: boolean;
  /** Marketing consent */
  marketing: boolean;
  /** Analytics consent */
  analytics: boolean;
  /** Consent date */
  consentedAt: Date;
  /** Consent version */
  consentVersion: string;
}

// ============================================================================
// Localization Types
// ============================================================================

/**
 * Localization configuration
 */
export interface LocalizationConfig {
  /** Default language */
  defaultLanguage: string;
  /** Supported languages */
  supportedLanguages: string[];
  /** Enable auto-detection */
  autoDetect: boolean;
  /** Fallback language */
  fallbackLanguage: string;
}

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = ['en', 'ru', 'zh'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// ============================================================================
// Event Types
// ============================================================================

/**
 * MVP event types
 */
export type MVPEventType =
  | 'user_registered'
  | 'user_onboarded'
  | 'wallet_created'
  | 'wallet_connected'
  | 'agent_created'
  | 'agent_activated'
  | 'agent_paused'
  | 'agent_stopped'
  | 'strategy_published'
  | 'strategy_copied'
  | 'trade_executed'
  | 'profit_realized'
  | 'ranking_updated'
  | 'risk_alert'
  | 'admin_action'
  | 'revenue_collected'
  | 'payout_processed'
  | 'referral_activated'
  | 'consent_updated';

/**
 * MVP event
 */
export interface MVPEvent {
  /** Event type */
  type: MVPEventType;
  /** Event timestamp */
  timestamp: Date;
  /** User ID (if applicable) */
  userId?: string;
  /** Agent ID (if applicable) */
  agentId?: string;
  /** Strategy ID (if applicable) */
  strategyId?: string;
  /** Event data */
  data: Record<string, unknown>;
  /** Event metadata */
  metadata?: Record<string, unknown>;
}

/**
 * MVP event callback
 */
export type MVPEventCallback = (event: MVPEvent) => void;

// ============================================================================
// Health Types
// ============================================================================

/**
 * MVP health status
 */
export interface MVPHealth {
  /** Overall health */
  overall: 'healthy' | 'degraded' | 'unhealthy';
  /** Component health */
  components: {
    telegramApp: boolean;
    marketplace: boolean;
    ranking: boolean;
    admin: boolean;
    revenue: boolean;
    growth: boolean;
    ai: boolean;
  };
  /** Last health check */
  lastCheck: Date;
  /** Health details */
  details: Record<string, unknown>;
}
