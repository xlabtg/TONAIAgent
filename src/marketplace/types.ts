/**
 * TONAIAgent - Marketplace Layer Type Definitions
 *
 * Core types for the strategy marketplace, copy trading, and reputation system.
 * Supports strategy discovery, capital allocation, and performance tracking.
 */

// ============================================================================
// Strategy Types
// ============================================================================

export type StrategyCategory =
  | 'yield_farming'
  | 'arbitrage'
  | 'liquidity_provision'
  | 'nft_trading'
  | 'dao_governance'
  | 'delta_neutral'
  | 'hedging'
  | 'grid_trading'
  | 'momentum'
  | 'mean_reversion';

export type StrategyVisibility = 'public' | 'private' | 'invite_only';

export type StrategyStatus = 'draft' | 'pending_review' | 'active' | 'paused' | 'deprecated' | 'archived';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  category: StrategyCategory;
  visibility: StrategyVisibility;
  status: StrategyStatus;
  version: string;
  versionHistory: StrategyVersion[];
  config: StrategyConfig;
  riskProfile: StrategyRiskProfile;
  performance: StrategyPerformance;
  metadata: StrategyMetadata;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface StrategyVersion {
  version: string;
  changelog: string;
  config: StrategyConfig;
  createdAt: Date;
  deprecated?: boolean;
  migratedTo?: string;
}

export interface StrategyConfig {
  supportedProtocols: string[];
  supportedTokens: string[];
  minCapital: number; // in TON
  maxCapital: number;
  targetApy?: number;
  rebalanceInterval?: number; // in minutes
  slippageTolerance: number; // percentage
  stopLossPercent?: number;
  takeProfitPercent?: number;
  parameters: Record<string, StrategyParameter>;
}

export interface StrategyParameter {
  name: string;
  description: string;
  type: 'number' | 'string' | 'boolean' | 'select';
  defaultValue: unknown;
  minValue?: number;
  maxValue?: number;
  options?: string[];
  required: boolean;
}

export interface StrategyRiskProfile {
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  volatilityScore: number; // 0-100
  maxDrawdown: number; // percentage
  smartContractRisk: 'low' | 'medium' | 'high';
  liquidityRisk: 'low' | 'medium' | 'high';
  impermanentLossRisk?: boolean;
  warnings: string[];
}

export interface StrategyPerformance {
  totalReturns: number; // percentage
  roi30d: number;
  roi90d: number;
  roi365d: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  avgDrawdown: number;
  winRate: number;
  profitFactor: number;
  volatility: number;
  beta?: number;
  alpha?: number;
  calmarRatio?: number;
  updatedAt: Date;
}

export interface StrategyMetadata {
  tags: string[];
  backtestResults?: BacktestResult;
  auditInfo?: AuditInfo;
  socialLinks?: SocialLinks;
  featuredUntil?: Date;
  totalFollowers: number;
  totalCapitalManaged: number;
  avgUserRating: number;
  ratingCount: number;
}

export interface BacktestResult {
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  finalCapital: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  maxDrawdown: number;
  sharpeRatio: number;
  benchmark?: string;
  benchmarkReturn?: number;
  dataSource: string;
  methodology: string;
}

export interface AuditInfo {
  auditor: string;
  auditDate: Date;
  reportUrl?: string;
  score?: number;
  findings: AuditFinding[];
}

export interface AuditFinding {
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  status: 'open' | 'acknowledged' | 'resolved';
}

export interface SocialLinks {
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  github?: string;
}

// ============================================================================
// Agent Types (Trading Agents in Marketplace)
// ============================================================================

export type AgentStatus = 'active' | 'paused' | 'stopped' | 'error' | 'migrating';

export interface TradingAgent {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  strategyId: string;
  status: AgentStatus;
  walletAddress: string;
  config: AgentDeploymentConfig;
  performance: AgentPerformance;
  reputation: AgentReputation;
  followers: FollowerInfo[];
  createdAt: Date;
  lastActivityAt: Date;
}

export interface AgentDeploymentConfig {
  strategyVersion: string;
  customParameters: Record<string, unknown>;
  capitalAllocated: number;
  maxCapitalFromFollowers: number;
  autoRebalance: boolean;
  riskOverrides?: Partial<StrategyRiskProfile>;
}

export interface AgentPerformance {
  totalPnl: number;
  totalPnlPercent: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  avgTradeSize: number;
  avgHoldingPeriod: number; // in hours
  currentPositions: Position[];
  performanceHistory: PerformanceSnapshot[];
}

export interface Position {
  token: string;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  openedAt: Date;
}

export interface PerformanceSnapshot {
  timestamp: Date;
  totalValue: number;
  pnl: number;
  pnlPercent: number;
  drawdown: number;
}

export interface FollowerInfo {
  userId: string;
  allocatedCapital: number;
  copyRatio: number; // 0-1, percentage of agent trades to copy
  startedAt: Date;
  totalPnl: number;
  status: 'active' | 'paused' | 'exiting';
}

// ============================================================================
// Reputation and Scoring Types
// ============================================================================

export interface AgentReputation {
  overallScore: number; // 0-100
  trustScore: number;
  performanceScore: number;
  consistencyScore: number;
  reliabilityScore: number;
  transparencyScore: number;
  communityScore: number;
  tier: ReputationTier;
  badges: Badge[];
  history: ReputationHistory[];
  fraudFlags: FraudFlag[];
  verificationStatus: VerificationStatus;
}

export type ReputationTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'trust' | 'community' | 'milestone';
  earnedAt: Date;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface ReputationHistory {
  timestamp: Date;
  overallScore: number;
  event?: string;
  scoreChange?: number;
}

export interface FraudFlag {
  id: string;
  type: FraudType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string[];
  detectedAt: Date;
  status: 'investigating' | 'confirmed' | 'dismissed';
  resolvedAt?: Date;
  resolution?: string;
}

export type FraudType =
  | 'wash_trading'
  | 'fake_performance'
  | 'strategy_cloning'
  | 'front_running'
  | 'manipulation'
  | 'pump_and_dump'
  | 'fake_volume'
  | 'sybil_attack';

export interface VerificationStatus {
  identityVerified: boolean;
  strategyAudited: boolean;
  trackRecordVerified: boolean;
  communityEndorsed: boolean;
  platformCertified: boolean;
  verificationDate?: Date;
  verifier?: string;
}

// ============================================================================
// Scoring Model Types
// ============================================================================

export interface ScoringModel {
  id: string;
  name: string;
  version: string;
  weights: ScoringWeights;
  thresholds: ScoringThresholds;
  features: ScoringFeature[];
  lastUpdated: Date;
}

export interface ScoringWeights {
  performance: number;
  consistency: number;
  riskAdjustedReturns: number;
  capitalManaged: number;
  userRetention: number;
  executionReliability: number;
  transparency: number;
  communityFeedback: number;
}

export interface ScoringThresholds {
  minScoreForListing: number;
  bronzeThreshold: number;
  silverThreshold: number;
  goldThreshold: number;
  platinumThreshold: number;
  diamondThreshold: number;
  fraudDetectionThreshold: number;
}

export interface ScoringFeature {
  name: string;
  weight: number;
  extractor: string; // Feature extraction method identifier
  normalization: 'minmax' | 'zscore' | 'percentile' | 'log';
  missingValueStrategy: 'zero' | 'mean' | 'median' | 'exclude';
}

export interface ScoringResult {
  agentId: string;
  modelId: string;
  timestamp: Date;
  overallScore: number;
  componentScores: Record<string, number>;
  featureValues: Record<string, number>;
  tier: ReputationTier;
  confidence: number;
  anomalyFlags: AnomalyFlag[];
}

export interface AnomalyFlag {
  feature: string;
  value: number;
  expectedRange: [number, number];
  severity: 'warning' | 'alert' | 'critical';
  description: string;
}

// ============================================================================
// Copy Trading Types
// ============================================================================

export type CopyStatus = 'active' | 'paused' | 'stopping' | 'stopped' | 'error';

export interface CopyTradingPosition {
  id: string;
  userId: string;
  agentId: string;
  status: CopyStatus;
  config: CopyConfig;
  performance: CopyPerformance;
  riskControls: CopyRiskControls;
  createdAt: Date;
  updatedAt: Date;
  exitedAt?: Date;
}

export interface CopyConfig {
  capitalAllocated: number;
  copyRatio: number; // 0-1
  maxPositionSize: number;
  proportionalAllocation: boolean;
  autoRebalance: boolean;
  rebalanceThreshold: number; // percentage deviation to trigger rebalance
  slippageProtection: number;
  excludeTokens?: string[];
  excludeProtocols?: string[];
}

export interface CopyPerformance {
  totalPnl: number;
  totalPnlPercent: number;
  copiedTrades: number;
  successfulCopies: number;
  failedCopies: number;
  skippedTrades: number;
  avgSlippage: number;
  feePaid: number;
  currentValue: number;
}

export interface CopyRiskControls {
  maxDailyLoss: number; // absolute value
  maxDailyLossPercent: number;
  maxDrawdown: number;
  stopLossTriggered: boolean;
  pauseOnAgentPause: boolean;
  pauseOnHighVolatility: boolean;
  volatilityThreshold: number;
}

export interface CopyTradeEvent {
  id: string;
  copyPositionId: string;
  agentTradeId: string;
  type: 'copy_executed' | 'copy_failed' | 'copy_skipped' | 'rebalance' | 'exit';
  details: CopyTradeDetails;
  timestamp: Date;
}

export interface CopyTradeDetails {
  token?: string;
  side?: 'buy' | 'sell';
  agentAmount?: number;
  copyAmount?: number;
  price?: number;
  slippage?: number;
  fee?: number;
  reason?: string;
  error?: string;
}

// ============================================================================
// Monetization Types
// ============================================================================

export type FeeType = 'performance' | 'management' | 'subscription' | 'referral' | 'platform';

export interface FeeStructure {
  id: string;
  strategyId?: string;
  agentId?: string;
  creatorId: string;
  fees: Fee[];
  revenueShare: RevenueShare;
  effectiveFrom: Date;
  effectiveUntil?: Date;
}

export interface Fee {
  type: FeeType;
  rate: number; // percentage
  minAmount?: number;
  maxAmount?: number;
  frequency?: 'per_trade' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  conditions?: FeeCondition[];
}

export interface FeeCondition {
  field: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  value: number;
}

export interface RevenueShare {
  creatorShare: number;
  platformShare: number;
  referrerShare: number;
  stakersShare?: number;
}

export interface MonetizationStats {
  agentId?: string;
  creatorId: string;
  period: 'day' | 'week' | 'month' | 'year' | 'all_time';
  totalRevenue: number;
  performanceFees: number;
  managementFees: number;
  subscriptionFees: number;
  referralFees: number;
  platformFees: number;
  netEarnings: number;
  followerCount: number;
  capitalUnderManagement: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface Payout {
  id: string;
  recipientId: string;
  recipientType: 'creator' | 'referrer' | 'platform' | 'staker';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fees: number;
  netAmount: number;
  txHash?: string;
  createdAt: Date;
  processedAt?: Date;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface PerformanceAnalytics {
  agentId: string;
  period: AnalyticsPeriod;
  returns: ReturnMetrics;
  risk: RiskMetrics;
  trading: TradingMetrics;
  comparison: ComparisonMetrics;
  generatedAt: Date;
}

export type AnalyticsPeriod = '1d' | '7d' | '30d' | '90d' | '365d' | 'all_time' | 'custom';

export interface ReturnMetrics {
  totalReturn: number;
  absoluteReturn: number;
  annualizedReturn: number;
  dailyReturns: number[];
  weeklyReturns: number[];
  monthlyReturns: number[];
  timeWeightedReturn: number;
  moneyWeightedReturn: number;
  bestDay: { date: Date; return: number };
  worstDay: { date: Date; return: number };
  bestMonth: { date: Date; return: number };
  worstMonth: { date: Date; return: number };
  positiveMonths: number;
  negativeMonths: number;
}

export interface RiskMetrics {
  volatility: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  informationRatio?: number;
  maxDrawdown: number;
  maxDrawdownDuration: number; // in days
  avgDrawdown: number;
  currentDrawdown: number;
  var95: number; // Value at Risk 95%
  var99: number;
  cvar95: number; // Conditional VaR
  beta?: number;
  alpha?: number;
  correlation?: number;
}

export interface TradingMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  avgHoldingPeriod: number;
  avgTradesPerDay: number;
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  expectancy: number;
}

export interface ComparisonMetrics {
  benchmarks: BenchmarkComparison[];
  peerRanking: PeerRanking;
  categoryAverage: number;
}

export interface BenchmarkComparison {
  benchmark: string;
  benchmarkReturn: number;
  agentReturn: number;
  outperformance: number;
  trackingError: number;
  informationRatio: number;
}

export interface PeerRanking {
  category: StrategyCategory;
  totalAgents: number;
  rank: number;
  percentile: number;
  rankByMetric: Record<string, number>;
}

// ============================================================================
// Marketplace Discovery Types
// ============================================================================

export interface MarketplaceQuery {
  categories?: StrategyCategory[];
  riskLevels?: ('low' | 'medium' | 'high' | 'extreme')[];
  minReturns?: number;
  maxDrawdown?: number;
  minSharpeRatio?: number;
  minCapital?: number;
  maxCapital?: number;
  minFollowers?: number;
  minRating?: number;
  verifiedOnly?: boolean;
  tags?: string[];
  protocols?: string[];
  tokens?: string[];
  sortBy?: MarketplaceSortField;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export type MarketplaceSortField =
  | 'returns'
  | 'sharpe_ratio'
  | 'followers'
  | 'capital_managed'
  | 'rating'
  | 'reputation'
  | 'newest'
  | 'trending';

export interface MarketplaceResult {
  items: MarketplaceItem[];
  total: number;
  page: number;
  limit: number;
  facets: MarketplaceFacets;
}

export interface MarketplaceItem {
  agent: TradingAgent;
  strategy: Strategy;
  creator: CreatorProfile;
  highlights: ItemHighlights;
}

export interface CreatorProfile {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  totalStrategies: number;
  totalFollowers: number;
  totalCapitalManaged: number;
  reputation: AgentReputation;
  joinedAt: Date;
  verified: boolean;
}

export interface ItemHighlights {
  returnsRank?: number;
  riskAdjustedRank?: number;
  trending?: boolean;
  featured?: boolean;
  newlyListed?: boolean;
  topPerformer?: boolean;
}

export interface MarketplaceFacets {
  categories: FacetCount[];
  riskLevels: FacetCount[];
  protocols: FacetCount[];
  tokens: FacetCount[];
  tags: FacetCount[];
}

export interface FacetCount {
  value: string;
  count: number;
}

// ============================================================================
// Leaderboard Types
// ============================================================================

export interface Leaderboard {
  id: string;
  name: string;
  type: LeaderboardType;
  period: AnalyticsPeriod;
  category?: StrategyCategory;
  entries: LeaderboardEntry[];
  generatedAt: Date;
  nextUpdate: Date;
}

export type LeaderboardType =
  | 'top_performers'
  | 'top_risk_adjusted'
  | 'most_followed'
  | 'highest_aum'
  | 'most_consistent'
  | 'rising_stars'
  | 'top_creators';

export interface LeaderboardEntry {
  rank: number;
  previousRank?: number;
  agentId?: string;
  creatorId?: string;
  name: string;
  avatar?: string;
  score: number;
  change: number;
  metric: string;
  secondaryMetrics: Record<string, number>;
}

// ============================================================================
// Social Features Types (Phase 2)
// ============================================================================

export interface SocialProfile {
  userId: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  followers: number;
  following: number;
  reputation: number;
  achievements: Badge[];
  activity: SocialActivity[];
  createdAt: Date;
}

export interface SocialActivity {
  id: string;
  type: SocialActivityType;
  timestamp: Date;
  content: string;
  relatedId?: string;
  likes: number;
  comments: number;
}

export type SocialActivityType =
  | 'strategy_published'
  | 'agent_deployed'
  | 'milestone_reached'
  | 'badge_earned'
  | 'followed_agent'
  | 'comment'
  | 'review';

export interface StrategyReview {
  id: string;
  strategyId: string;
  userId: string;
  rating: number; // 1-5
  title: string;
  content: string;
  helpfulVotes: number;
  verified: boolean; // User actually used the strategy
  createdAt: Date;
  updatedAt?: Date;
}

export interface StrategyComment {
  id: string;
  strategyId: string;
  userId: string;
  parentId?: string;
  content: string;
  likes: number;
  replies: number;
  createdAt: Date;
  updatedAt?: Date;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface MarketplaceConfig {
  enabled: boolean;
  discovery: DiscoveryConfig;
  copyTrading: CopyTradingConfig;
  scoring: ScoringConfig;
  monetization: MonetizationConfig;
  riskTransparency: RiskTransparencyConfig;
  social: SocialConfig;
}

export interface DiscoveryConfig {
  maxResultsPerPage: number;
  cacheTimeSeconds: number;
  featuredSlots: number;
  trendingWindowHours: number;
  minScoreForListing: number;
}

export interface CopyTradingConfig {
  enabled: boolean;
  minCopyAmount: number;
  maxCopyAmount: number;
  defaultSlippageProtection: number;
  maxFollowersPerAgent: number;
  cooldownPeriodMinutes: number;
}

export interface ScoringConfig {
  updateFrequencyMinutes: number;
  anomalyDetectionEnabled: boolean;
  mlModelId?: string;
  groqApiEnabled: boolean; // Use Groq for scoring and anomaly detection
}

export interface MonetizationConfig {
  platformFeePercent: number;
  maxPerformanceFee: number;
  maxManagementFee: number;
  payoutFrequency: 'daily' | 'weekly' | 'monthly';
  minPayoutAmount: number;
}

export interface RiskTransparencyConfig {
  requireWarnings: boolean;
  maxRiskLevel: 'low' | 'medium' | 'high' | 'extreme';
  requireBacktest: boolean;
  requireAudit: boolean;
  capitalCaps: CapitalCap[];
}

export interface CapitalCap {
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  maxCapitalPercent: number; // of user's total
  maxAbsoluteCapital: number;
}

export interface SocialConfig {
  enabled: boolean;
  leaderboardsEnabled: boolean;
  commentsEnabled: boolean;
  reviewsEnabled: boolean;
  activityFeedEnabled: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

export interface MarketplaceEvent {
  id: string;
  timestamp: Date;
  type: MarketplaceEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  data: Record<string, unknown>;
}

export type MarketplaceEventType =
  | 'strategy_published'
  | 'strategy_updated'
  | 'strategy_deprecated'
  | 'agent_deployed'
  | 'agent_paused'
  | 'agent_stopped'
  | 'copy_started'
  | 'copy_stopped'
  | 'trade_copied'
  | 'score_updated'
  | 'fraud_detected'
  | 'payout_processed'
  | 'leaderboard_updated';

export type MarketplaceEventCallback = (event: MarketplaceEvent) => void;
