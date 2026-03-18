/**
 * TONAIAgent - Tokenomics Layer Type Definitions
 *
 * Core types for the tokenomics and agent economy system.
 * Supports staking, governance, rewards, reputation, and anti-exploit mechanisms.
 */

// ============================================================================
// Token Types
// ============================================================================

export interface TokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: string; // BigInt as string
  contractAddress?: string;
}

export interface TokenBalance {
  available: string;
  staked: string;
  locked: string;
  pending: string;
  total: string;
}

export type TokenTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface TierConfig {
  tier: TokenTier;
  minStake: string;
  feeDiscount: number; // 0-1
  features: string[];
}

export interface FeeDiscountResult {
  discountPercent: number;
  tier: TokenTier;
  nextTier?: TokenTier;
  amountToNextTier?: string;
}

export interface PremiumAccessResult {
  hasAccess: boolean;
  features: string[];
  tier: TokenTier;
  expiresAt?: Date;
}

export interface VotingPowerResult {
  votingPower: string;
  baseVotingPower: string;
  lockBonus: string;
  delegatedPower: string;
  reputationBonus: string;
  multiplier: number;
}

// ============================================================================
// Staking Types
// ============================================================================

export interface StakingConfig {
  enabled: boolean;
  minStakeAmount: string;
  maxStakeAmount: string;
  lockPeriods: number[]; // days
  rewardRates: number[]; // APY for each lock period
  slashingEnabled: boolean;
  compoundingEnabled: boolean;
  cooldownPeriod: number; // seconds
}

export interface StakeRequest {
  userId: string;
  agentId?: string;
  amount: string;
  lockPeriod: number; // days
  autoCompound?: boolean;
  purpose?: StakePurpose;
}

export type StakePurpose =
  | 'general'
  | 'governance'
  | 'strategy_deployment'
  | 'reputation_collateral'
  | 'liquidity_provision';

export interface StakePosition {
  id: string;
  userId: string;
  agentId?: string;
  amount: string;
  lockPeriod: number;
  lockStartDate: Date;
  unlockDate: Date;
  rewardRate: number;
  expectedApy: number;
  autoCompound: boolean;
  purpose: StakePurpose;
  pendingRewards: string;
  claimedRewards: string;
  status: StakeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type StakeStatus = 'active' | 'unlocking' | 'unlocked' | 'slashed' | 'withdrawn';

export interface StakingPosition {
  userId: string;
  totalStaked: string;
  totalLocked: string;
  availableToUnstake: string;
  pendingRewards: string;
  claimedRewards: string;
  stakes: StakePosition[];
  tier: TokenTier;
  votingPower: string;
  lastClaimDate?: Date;
}

export interface UnstakeRequest {
  userId: string;
  stakeId: string;
  amount?: string; // If not provided, unstake full position
}

export interface UnstakeResult {
  success: boolean;
  stakeId: string;
  amount: string;
  penaltyAmount: string;
  netAmount: string;
  cooldownEndDate?: Date;
  reason?: string;
}

export interface ClaimRewardsResult {
  success: boolean;
  amount: string;
  rewardBreakdown: RewardBreakdown;
  txId?: string;
}

export interface RewardBreakdown {
  stakingRewards: string;
  performanceRewards: string;
  referralRewards: string;
  bonusRewards: string;
  total: string;
}

export interface RewardsCalculation {
  baseReward: string;
  bonusReward: string;
  compoundedReward: string;
  totalPending: string;
  currentApy: number;
  projectedAnnualReward: string;
}

export interface AgentStakeRequirements {
  minStake: string;
  requiredDuration: number; // days
  slashable: boolean;
  requiredTier: TokenTier;
}

export interface AgentStakeStatus {
  agentId: string;
  staked: string;
  locked: boolean;
  unlockDate?: Date;
  slashRisk: number; // 0-1
  collateralRatio: number;
  status: 'active' | 'at_risk' | 'slashed' | 'insufficient';
}

// ============================================================================
// Slashing Types
// ============================================================================

export interface SlashCondition {
  type: SlashConditionType;
  severity: SlashSeverity;
  slashPercent: number;
  evidence: string[];
  gracePeriod?: number; // days
}

export type SlashConditionType =
  | 'malicious_strategy'
  | 'false_reporting'
  | 'protocol_violation'
  | 'inactivity'
  | 'manipulation'
  | 'fraud';

export type SlashSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SlashEvent {
  id: string;
  targetId: string;
  targetType: 'user' | 'agent';
  condition: SlashConditionType;
  amount: string;
  evidence: string[];
  executedAt: Date;
  executedBy: string;
  appealable: boolean;
  appealDeadline?: Date;
  status: SlashStatus;
}

export type SlashStatus = 'executed' | 'appealed' | 'reversed' | 'confirmed';

// ============================================================================
// Rewards Types
// ============================================================================

export interface RewardsConfig {
  distributionSchedule: 'hourly' | 'daily' | 'weekly';
  feeDistribution: FeeDistribution;
  emissionSchedule: EmissionSchedule;
  vestingEnabled: boolean;
  vestingCliff: number; // days
  vestingDuration: number; // days
  immediateReleasePercent: number;
}

export interface FeeDistribution {
  creators: number; // 0-1
  stakers: number;
  treasury: number;
  liquidity: number;
}

export interface EmissionSchedule {
  year1: string;
  year2: string;
  year3: string;
  year4: string;
  [key: string]: string;
}

export interface CreatorEarningsRequest {
  creatorId: string;
  strategyId?: string;
  period: 'day' | 'week' | 'month' | 'year' | 'all';
}

export interface CreatorEarnings {
  creatorId: string;
  period: string;
  performanceFees: string;
  platformRewards: string;
  referralRewards: string;
  bonuses: string;
  total: string;
  vestedAmount: string;
  claimableAmount: string;
  strategies: StrategyEarnings[];
}

export interface StrategyEarnings {
  strategyId: string;
  performanceFees: string;
  copierCount: number;
  tvl: string;
  periodReturn: number;
}

export interface DistributionSummary {
  period: string;
  totalDistributed: string;
  byCategory: CategoryDistribution;
  uniqueRecipients: number;
  averageReward: string;
  topRecipients: RecipientReward[];
}

export interface CategoryDistribution {
  creators: string;
  stakers: string;
  treasury: string;
  liquidity: string;
}

export interface RecipientReward {
  recipientId: string;
  recipientType: 'user' | 'agent' | 'pool';
  amount: string;
  category: string;
}

export interface PerformanceFeeCalculation {
  strategyId: string;
  profitAmount: string;
  eligibleProfit: string;
  creatorFee: string;
  platformFee: string;
  userReceives: string;
  highWaterMark: string;
  newHighWaterMark: string;
}

export interface VestingStatus {
  userId: string;
  totalAllocated: string;
  vestedAmount: string;
  claimableAmount: string;
  claimedAmount: string;
  lockedAmount: string;
  vestingStartDate: Date;
  cliffEndDate: Date;
  vestingEndDate: Date;
  nextVestingDate?: Date;
  nextVestingAmount?: string;
}

// ============================================================================
// Governance Types
// ============================================================================

export interface GovernanceConfig {
  enabled: boolean;
  proposalThreshold: string; // tokens required to create proposal
  votingPeriod: number; // days
  executionDelay: number; // days
  quorumPercent: number;
  supermajorityPercent: number;
  gracePeriod: number; // days
  maxActionsPerProposal: number;
  delegationEnabled: boolean;
}

export interface ProposalRequest {
  proposer: string;
  title: string;
  description: string;
  type: ProposalType;
  category: ProposalCategory;
  parameters?: Record<string, unknown>;
  actions?: ProposalAction[];
  discussionUrl?: string;
}

export type ProposalType =
  | 'parameter_change'
  | 'treasury_spend'
  | 'protocol_upgrade'
  | 'emergency'
  | 'grant'
  | 'text';

export type ProposalCategory =
  | 'fees'
  | 'staking'
  | 'rewards'
  | 'governance'
  | 'security'
  | 'development'
  | 'marketing'
  | 'other';

export interface ProposalAction {
  target: string;
  functionName: string;
  parameters: unknown[];
  value?: string;
}

export interface Proposal {
  id: string;
  proposer: string;
  title: string;
  description: string;
  type: ProposalType;
  category: ProposalCategory;
  status: ProposalStatus;
  parameters?: Record<string, unknown>;
  actions: ProposalAction[];
  discussionUrl?: string;
  votingStartsAt: Date;
  votingEndsAt: Date;
  executionDeadline: Date;
  votes: ProposalVotes;
  quorumReached: boolean;
  passed: boolean;
  executedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
}

export type ProposalStatus =
  | 'pending'
  | 'active'
  | 'passed'
  | 'failed'
  | 'queued'
  | 'executed'
  | 'cancelled'
  | 'expired';

export interface ProposalVotes {
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  totalVotes: string;
  voterCount: number;
  participation: number; // percentage of total voting power
}

export interface VoteRequest {
  proposalId: string;
  voter: string;
  support: boolean | 'abstain';
  votingPower?: string; // If not provided, calculated automatically
  reason?: string;
}

export interface Vote {
  id: string;
  proposalId: string;
  voter: string;
  support: boolean | 'abstain';
  votingPower: string;
  reason?: string;
  timestamp: Date;
}

export interface DelegationRequest {
  delegator: string;
  delegatee: string;
  amount: string;
}

export interface Delegation {
  id: string;
  delegator: string;
  delegatee: string;
  amount: string;
  createdAt: Date;
  revokedAt?: Date;
}

export interface GovernanceStats {
  totalProposals: number;
  passedProposals: number;
  failedProposals: number;
  activeProposals: number;
  totalVotesCast: string;
  uniqueVoters: number;
  averageParticipation: number;
  treasuryBalance: string;
}

// ============================================================================
// Reputation Types
// ============================================================================

export interface ReputationConfig {
  enabled: boolean;
  minScore: number;
  maxScore: number;
  decayRate: number; // monthly decay rate
  updateFrequency: 'realtime' | 'hourly' | 'daily';
  factors: ReputationFactors;
}

export interface ReputationFactors {
  performance: number; // weight 0-1
  reliability: number;
  history: number;
  community: number;
  compliance: number;
}

export type ReputationTier = 'newcomer' | 'established' | 'trusted' | 'expert' | 'elite';

export interface ReputationScore {
  userId: string;
  overall: number;
  breakdown: ReputationBreakdown;
  tier: ReputationTier;
  percentile: number;
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: Date;
}

export interface ReputationBreakdown {
  performance: number;
  reliability: number;
  history: number;
  community: number;
  compliance: number;
}

export interface ReputationHistoryRequest {
  userId: string;
  period: '7d' | '30d' | '90d' | '365d' | 'all';
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

export interface ReputationHistory {
  userId: string;
  period: string;
  dataPoints: ReputationDataPoint[];
  summary: ReputationSummary;
}

export interface ReputationDataPoint {
  timestamp: Date;
  score: number;
  breakdown?: ReputationBreakdown;
}

export interface ReputationSummary {
  averageScore: number;
  minScore: number;
  maxScore: number;
  startScore: number;
  endScore: number;
  percentChange: number;
  significantEvents: ReputationEvent[];
}

export interface ReputationEvent {
  id: string;
  userId: string;
  eventType: ReputationEventType;
  impact: number; // positive or negative
  details: Record<string, unknown>;
  timestamp: Date;
}

export type ReputationEventType =
  | 'strategy_performance'
  | 'user_rating'
  | 'protocol_violation'
  | 'governance_participation'
  | 'community_contribution'
  | 'slashing'
  | 'milestone_achieved';

export interface ReputationAccessCheck {
  userId: string;
  feature: string;
  requiredTier?: ReputationTier;
  requiredScore?: number;
}

export interface ReputationAccessResult {
  allowed: boolean;
  reason?: string;
  currentScore: number;
  requiredScore: number;
  currentTier: ReputationTier;
  requiredTier?: ReputationTier;
  scoreNeeded?: number;
}

export interface ReputationRequirements {
  feature: string;
  minScore: number;
  minTier: ReputationTier;
  minHistory: number; // days
  additionalRequirements?: string[];
}

// ============================================================================
// Agent Economy Types
// ============================================================================

export interface AgentEconomyConfig {
  enabled: boolean;
  minPoolSize: string;
  maxPoolSize: string;
  managementFee: number;
  performanceFee: number;
  fundingEnabled: boolean;
  marketplaceEnabled: boolean;
}

export interface CapitalPoolRequest {
  managerId: string;
  name: string;
  description: string;
  minInvestment: string;
  maxCapacity: string;
  strategy: PoolStrategy;
}

export interface PoolStrategy {
  riskLevel: 'low' | 'medium' | 'high' | 'aggressive';
  targetReturn: number; // APY
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
  allowedAssets?: string[];
  maxDrawdown?: number;
}

export interface CapitalPool {
  id: string;
  managerId: string;
  name: string;
  description: string;
  status: PoolStatus;
  tvl: string;
  investorCount: number;
  minInvestment: string;
  maxCapacity: string;
  capacityRemaining: string;
  strategy: PoolStrategy;
  performance: PoolPerformance;
  fees: PoolFees;
  createdAt: Date;
  updatedAt: Date;
}

export type PoolStatus = 'active' | 'paused' | 'closed' | 'liquidating';

export interface PoolPerformance {
  return24h: number;
  return7d: number;
  return30d: number;
  return90d: number;
  returnYtd: number;
  returnAllTime: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  winRate: number;
}

export interface PoolFees {
  managementFee: number;
  performanceFee: number;
  entryFee: number;
  exitFee: number;
}

export interface InvestmentRequest {
  poolId: string;
  investorId: string;
  amount: string;
}

export interface Investment {
  id: string;
  poolId: string;
  investorId: string;
  amount: string;
  shares: string;
  sharePrice: string;
  value: string;
  profit: string;
  profitPercent: number;
  investedAt: Date;
  lastValueUpdate: Date;
}

export interface WithdrawalRequest {
  poolId: string;
  investorId: string;
  amount?: string; // shares or value
  withdrawType: 'shares' | 'value';
}

export interface WithdrawalResult {
  success: boolean;
  poolId: string;
  investorId: string;
  sharesRedeemed: string;
  amountReceived: string;
  fees: string;
  exitPenalty: string;
  processingTime?: Date;
  reason?: string;
}

export interface StrategyListingRequest {
  strategyId: string;
  creatorId: string;
  pricing: StrategyPricing;
  terms: StrategyTerms;
}

export interface StrategyPricing {
  copyFee: string; // one-time
  performanceFee: number;
  monthlyFee?: string;
}

export interface StrategyTerms {
  minInvestment: string;
  lockPeriod: number; // days
  maxCopiers: number;
  autoScale: boolean;
}

export interface StrategyListing {
  id: string;
  strategyId: string;
  creatorId: string;
  status: ListingStatus;
  pricing: StrategyPricing;
  terms: StrategyTerms;
  copierCount: number;
  totalAum: string;
  performance: StrategyPerformance;
  rating: number;
  reviewCount: number;
  createdAt: Date;
}

export type ListingStatus = 'active' | 'paused' | 'closed' | 'suspended';

export interface StrategyPerformance {
  return30d: number;
  return90d: number;
  returnAllTime: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  tradeCount: number;
}

export interface CopyStrategyRequest {
  strategyId: string;
  copierId: string;
  allocation: string;
  settings: CopySettings;
}

export interface CopySettings {
  slippageTolerance: number;
  maxDrawdown: number;
  stopLoss?: number;
  takeProfit?: number;
  maxPositionSize?: number;
}

export interface StrategyCopy {
  id: string;
  strategyId: string;
  copierId: string;
  allocation: string;
  currentValue: string;
  profit: string;
  profitPercent: number;
  settings: CopySettings;
  status: CopyStatus;
  startedAt: Date;
  lastSync: Date;
}

export type CopyStatus = 'active' | 'paused' | 'stopped' | 'error';

export interface MarketplaceRankingRequest {
  category?: string;
  sortBy: 'return' | 'sharpe_ratio' | 'aum' | 'copiers' | 'rating';
  period: '7d' | '30d' | '90d' | 'all';
  limit: number;
  offset?: number;
}

export interface MarketplaceRanking {
  listings: StrategyListing[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FundingRequest {
  requesterId: string;
  projectName: string;
  description: string;
  requestedAmount: string;
  milestones: FundingMilestone[];
  equity: number; // revenue share percentage
  category: string;
}

export interface FundingMilestone {
  description: string;
  amount: string;
  deadline: string;
  deliverables?: string[];
}

export interface FundingCampaign {
  id: string;
  requesterId: string;
  projectName: string;
  description: string;
  status: FundingStatus;
  requestedAmount: string;
  raisedAmount: string;
  contributorCount: number;
  equity: number;
  milestones: FundingMilestoneStatus[];
  deadline: Date;
  createdAt: Date;
}

export type FundingStatus = 'active' | 'funded' | 'failed' | 'cancelled' | 'completed';

export interface FundingMilestoneStatus extends FundingMilestone {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  completedAt?: Date;
  proofUrl?: string;
}

export interface FundingContribution {
  id: string;
  fundingId: string;
  contributorId: string;
  amount: string;
  equityShare: number;
  timestamp: Date;
}

// ============================================================================
// Anti-Exploit Types
// ============================================================================

export interface AntiExploitConfig {
  sybilDetectionEnabled: boolean;
  rateLimitingEnabled: boolean;
  emissionControlEnabled: boolean;
  slashingEnabled: boolean;
  rewardCaps: RewardCaps;
  minAccountAge: number; // days
  minStakeRequired: string;
  behaviorAnalysis: boolean;
}

export interface RewardCaps {
  daily: string;
  weekly: string;
  monthly: string;
}

export interface SybilCheckResult {
  userId: string;
  isSuspicious: boolean;
  riskScore: number;
  riskFactors: SybilRiskFactor[];
  recommendation: 'allow' | 'review' | 'block';
  details: Record<string, unknown>;
}

export interface SybilRiskFactor {
  factor: string;
  weight: number;
  score: number;
  description: string;
}

export interface ClaimValidationRequest {
  userId: string;
  rewardType: string;
  amount: string;
}

export interface ClaimValidationResult {
  allowed: boolean;
  reason?: string;
  cooldownRemaining?: number;
  dailyRemaining?: string;
  weeklyRemaining?: string;
  monthlyRemaining?: string;
}

export interface TokenomicsRateLimitConfig {
  operations: Record<string, OperationLimit>;
  cooldowns: Record<string, number>; // seconds
}

export interface OperationLimit {
  maxPerHour?: number;
  maxPerDay?: number;
  maxPerProposal?: number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  resetsAt: Date;
  cooldownActive: boolean;
  cooldownEndsAt?: Date;
}

export interface EmissionStatus {
  dailyEmitted: string;
  dailyCap: string;
  dailyRemaining: string;
  weeklyEmitted: string;
  weeklyCap: string;
  weeklyRemaining: string;
  monthlyEmitted: string;
  monthlyCap: string;
  monthlyRemaining: string;
  totalEmitted: string;
  inflationRate: number;
}

export interface SlashRequest {
  targetId: string;
  targetType: 'user' | 'agent';
  condition: SlashConditionType;
  evidence: string[];
  amount: string;
  executedBy: string;
}

export interface SlashResult {
  success: boolean;
  slashId: string;
  amount: string;
  appealable: boolean;
  appealDeadline?: Date;
  reason?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface TokenomicsConfig {
  token: TokenConfig;
  staking: StakingConfig;
  rewards: RewardsConfig;
  governance: GovernanceConfig;
  reputation: ReputationConfig;
  agentEconomy: AgentEconomyConfig;
  antiExploit: AntiExploitConfig;
}

// ============================================================================
// Event Types
// ============================================================================

export interface TokenomicsEvent {
  id: string;
  timestamp: Date;
  type: TokenomicsEventType;
  category: TokenomicsEventCategory;
  data: Record<string, unknown>;
  userId?: string;
  agentId?: string;
}

export type TokenomicsEventType =
  | 'stake_created'
  | 'stake_withdrawn'
  | 'rewards_claimed'
  | 'rewards_distributed'
  | 'proposal_created'
  | 'vote_cast'
  | 'proposal_executed'
  | 'delegation_created'
  | 'delegation_revoked'
  | 'reputation_updated'
  | 'slash_executed'
  | 'pool_created'
  | 'investment_made'
  | 'withdrawal_processed'
  | 'strategy_listed'
  | 'strategy_copied'
  | 'funding_created'
  | 'funding_contributed'
  | 'sybil_detected'
  | 'rate_limit_exceeded';

export type TokenomicsEventCategory =
  | 'staking'
  | 'rewards'
  | 'governance'
  | 'reputation'
  | 'agent_economy'
  | 'anti_exploit';

export type TokenomicsEventCallback = (event: TokenomicsEvent) => void;
