/**
 * TONAIAgent - Token Utility & Agent Economy Types (Issue #104)
 *
 * Core types for the Token Utility & Agent Economy layer, enabling a sustainable
 * decentralized AI economy where autonomous agents earn, pay, stake, and govern
 * using the native token.
 */

// ============================================================================
// Token Utility Framework Types
// ============================================================================

/**
 * Fee types within the token utility framework
 */
export type TokenFeeType =
  | 'agent_creation'        // Fee to create and deploy an agent
  | 'strategy_deployment'   // Fee to publish a strategy
  | 'automation_workflow'   // Fee for automation workflow execution
  | 'premium_feature'       // Fee to access premium features
  | 'execution_fee'         // Per-transaction execution fee
  | 'marketplace_listing'   // Fee to list in marketplace
  | 'marketplace_transaction'; // Fee on marketplace transactions

/**
 * A fee schedule entry defining costs for a specific action
 */
export interface FeeScheduleEntry {
  feeType: TokenFeeType;
  baseAmount: string;          // Base fee in tokens (with 9 decimals as string)
  discountable: boolean;       // Whether tier discounts apply
  burnPercent: number;         // 0-1, portion burned
  treasuryPercent: number;     // 0-1, portion to treasury
  creatorPercent: number;      // 0-1, portion to creator/deployer
  description: string;
}

/**
 * Result of a fee calculation
 */
export interface FeeCalculationResult {
  feeType: TokenFeeType;
  grossAmount: string;
  discountAmount: string;
  netAmount: string;
  burnAmount: string;
  treasuryAmount: string;
  creatorAmount: string;
  discountPercent: number;
  appliedTier: TokenUtilityTier;
}

/**
 * Tier levels for token utility benefits
 */
export type TokenUtilityTier = 'basic' | 'standard' | 'premium' | 'elite' | 'institutional';

/**
 * Configuration for a token utility tier
 */
export interface TokenUtilityTierConfig {
  tier: TokenUtilityTier;
  minStakedTokens: string;     // Minimum staked tokens required
  feeDiscount: number;         // 0-1, fee discount percentage
  features: string[];          // Features unlocked at this tier
  agentCreationLimit: number;  // Max agents (-1 = unlimited)
  strategyDeploymentLimit: number; // Max active strategies (-1 = unlimited)
  priorityAccess: boolean;     // Priority execution queue access
}

/**
 * Token utility health status
 */
export interface TokenUtilityFrameworkHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  feeScheduleActive: boolean;
  tierSystemActive: boolean;
  totalFeesCollected: string;
  totalFeesBurned: string;
  activeTierUsers: Record<TokenUtilityTier, number>;
}

// ============================================================================
// Agent Staking & Reputation Types
// ============================================================================

/**
 * Agent publication stake record
 */
export interface AgentPublicationStake {
  id: string;
  agentId: string;
  developerId: string;
  stakedAmount: string;
  requiredAmount: string;
  trustScore: number;          // 0-100 computed trust score
  tier: AgentTrustTier;
  slashRisk: number;           // 0-1 risk of slashing
  performanceScore: number;    // 0-100 current performance
  slashHistory: AgentSlashRecord[];
  stakedAt: Date;
  lastEvaluatedAt: Date;
  status: 'active' | 'at_risk' | 'slashed' | 'withdrawn';
}

/**
 * Trust tiers for agents based on stake amount
 */
export type AgentTrustTier = 'unverified' | 'verified' | 'trusted' | 'certified' | 'elite';

/**
 * Configuration for agent trust tier requirements
 */
export interface AgentTrustTierConfig {
  tier: AgentTrustTier;
  minStake: string;            // Minimum stake in tokens
  trustBonus: number;          // Visibility/ranking bonus
  features: string[];          // Additional features unlocked
  slashProtection: number;     // 0-1, protection against minor slashing
}

/**
 * Agent slashing record
 */
export interface AgentSlashRecord {
  id: string;
  agentId: string;
  reason: AgentSlashReason;
  amount: string;
  evidence: string[];
  severity: 'minor' | 'moderate' | 'severe' | 'critical';
  executedAt: Date;
  executedBy: string;
  appealDeadline: Date;
  status: 'pending' | 'confirmed' | 'appealed' | 'reversed';
}

/**
 * Reasons for slashing an agent's stake
 */
export type AgentSlashReason =
  | 'poor_performance'         // Below minimum performance thresholds
  | 'malicious_behavior'       // Detected harmful actions
  | 'false_reporting'          // Inaccurate performance reports
  | 'protocol_violation'       // Violating protocol rules
  | 'inactivity'               // Extended period of inactivity
  | 'collusion';               // Evidence of market manipulation

/**
 * Request to publish an agent with stake
 */
export interface AgentPublicationRequest {
  agentId: string;
  developerId: string;
  agentType: string;
  stakeAmount: string;
  metadata?: Record<string, unknown>;
}

/**
 * Agent staking reputation health
 */
export interface AgentStakingHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  totalAgentsStaked: number;
  totalStakedValue: string;
  averageTrustScore: number;
  slashingRate: number;       // Recent slashing rate 0-1
  agentsByTier: Record<AgentTrustTier, number>;
}

// ============================================================================
// Autonomous Agent Economy Types
// ============================================================================

/**
 * Autonomous agent economic profile
 */
export interface AgentEconomicProfile {
  agentId: string;
  walletAddress: string;
  tokenBalance: string;
  earnedTotal: string;
  spentTotal: string;
  computeCostTotal: string;
  apiCostTotal: string;
  reinvestedTotal: string;
  netRevenue: string;
  profitMargin: number;       // 0-1
  autonomyLevel: AgentAutonomyLevel;
  economicStatus: AgentEconomicStatus;
  lastUpdated: Date;
}

/**
 * Autonomy level of an agent's economic operations
 */
export type AgentAutonomyLevel =
  | 'supervised'    // All transactions require human approval
  | 'semi_auto'     // Routine transactions auto, large ones need approval
  | 'autonomous'    // Fully autonomous within configured limits
  | 'unrestricted'; // No limits (institutional/high-trust agents)

/**
 * Economic status of an agent
 */
export type AgentEconomicStatus =
  | 'bootstrapping'  // Newly created, building initial capital
  | 'growing'        // Revenue growing, reinvesting
  | 'profitable'     // Consistently profitable
  | 'struggling'     // Below break-even, at risk
  | 'suspended';     // Economic activity suspended

/**
 * An economic transaction between agents or agent and platform
 */
export interface AgentEconomicTransaction {
  id: string;
  fromAgentId: string;
  toAgentId?: string;         // Null if paying platform
  transactionType: AgentTransactionType;
  amount: string;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
}

/**
 * Types of economic transactions agents perform
 */
export type AgentTransactionType =
  | 'compute_payment'      // Agent pays for compute resources
  | 'api_payment'          // Agent pays for API usage
  | 'strategy_earning'     // Agent earns from strategy execution
  | 'service_earning'      // Agent earns from providing services
  | 'reinvestment'         // Agent reinvests capital
  | 'cross_agent_payment'  // Payment to another agent
  | 'fee_payment'          // Protocol fee payment
  | 'staking_reward';      // Staking reward received

/**
 * Agent compute resource usage and costs
 */
export interface AgentComputeUsage {
  agentId: string;
  period: string;
  computeUnits: number;
  apiCalls: number;
  storageBytes: number;
  bandwidthBytes: number;
  totalCost: string;
  breakdown: ComputeCostBreakdown;
}

/**
 * Breakdown of compute costs
 */
export interface ComputeCostBreakdown {
  computeCost: string;
  apiCost: string;
  storageCost: string;
  bandwidthCost: string;
}

/**
 * Agent economy health metrics
 */
export interface AgentEconomyHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  totalActiveAgents: number;
  totalTokensInCirculation: string;
  totalTransactionsToday: number;
  networkRevenue: string;
  averageAgentProfitMargin: number;
  agentsByStatus: Record<AgentEconomicStatus, number>;
}

// ============================================================================
// Revenue Sharing Model Types
// ============================================================================

/**
 * Revenue sharing configuration
 */
export interface RevenueSharingConfig {
  strategyCreatorPercent: number;   // % of performance fees to strategy creators
  platformProtocolPercent: number;  // % to protocol treasury
  daoTreasuryPercent: number;       // % to DAO treasury
  stakersPercent: number;           // % distributed to stakers
  liquidityPercent: number;         // % to liquidity providers
}

/**
 * A revenue distribution event
 */
export interface RevenueDistributionEvent {
  id: string;
  strategyId: string;
  profitAmount: string;
  distributions: RevenueRecipient[];
  totalDistributed: string;
  period: string;
  timestamp: Date;
  transactionIds: string[];
}

/**
 * A recipient in a revenue distribution
 */
export interface RevenueRecipient {
  recipientId: string;
  recipientType: 'creator' | 'protocol' | 'dao' | 'staker' | 'liquidity_provider';
  amount: string;
  percent: number;
}

/**
 * Revenue metrics for a creator
 */
export interface CreatorRevenueMetrics {
  creatorId: string;
  period: string;
  totalEarned: string;
  performanceFees: string;
  platformBonuses: string;
  strategies: StrategyRevenueMetric[];
  claimable: string;
  claimed: string;
  rank: number;
  percentile: number;
}

/**
 * Revenue metrics for a single strategy
 */
export interface StrategyRevenueMetric {
  strategyId: string;
  earned: string;
  copierCount: number;
  aum: string;               // Assets under management
  performancePercent: number;
  period: string;
}

/**
 * Platform-wide revenue summary
 */
export interface PlatformRevenueSummary {
  period: string;
  totalRevenue: string;
  protocolFees: string;
  strategyFees: string;
  marketplaceFees: string;
  totalDistributed: string;
  daoTreasuryAccumulated: string;
  stakersRewarded: string;
  liquidityIncentives: string;
}

// ============================================================================
// Buyback, Burn & Treasury Loop Types
// ============================================================================

/**
 * Buyback configuration
 */
export interface BuybackConfig {
  enabled: boolean;
  triggerThreshold: string;    // Revenue threshold to trigger buyback
  buybackPercent: number;      // 0-1, % of revenue used for buyback
  burnPercent: number;         // 0-1, % of bought tokens to burn
  treasuryPercent: number;     // 0-1, % to treasury allocation
  redistributePercent: number; // 0-1, % to redistribute to stakers
  cooldownPeriod: number;      // Seconds between buybacks
}

/**
 * A buyback and burn event
 */
export interface BuybackBurnEvent {
  id: string;
  triggeredBy: string;
  revenueAmount: string;
  buybackAmount: string;
  tokensBought: string;
  tokensBurned: string;
  tokensToTreasury: string;
  tokensRedistributed: string;
  priceAtBuyback: string;
  timestamp: Date;
  transactionId?: string;
}

/**
 * Treasury accumulation status
 */
export interface TreasuryAccumulationStatus {
  totalAccumulated: string;
  currentBalance: string;
  totalBurned: string;
  totalRedistributed: string;
  burnRate: number;            // Tokens burned per day
  buybackHistory: BuybackBurnEvent[];
  deflationaryPressure: number; // 0-1 scale
  nextBuybackEta?: Date;
}

/**
 * Token supply metrics
 */
export interface TokenSupplyMetrics {
  totalSupply: string;
  circulatingSupply: string;
  stakedSupply: string;
  lockedSupply: string;
  burnedSupply: string;
  treasurySupply: string;
  inflationRate: number;       // Annual inflation rate
  deflationRate: number;       // Annual deflation rate (from burns)
  netSupplyChange: number;     // Annual net change
}

// ============================================================================
// Liquidity & DeFi Integration Types
// ============================================================================

/**
 * Staking pool configuration
 */
export interface StakingPoolConfig {
  poolId: string;
  name: string;
  assetPair: string;           // e.g., "TONAI/TON"
  rewardToken: string;
  baseApy: number;             // Base annual percentage yield
  boostMultiplier: number;     // Max boost for long-term stakers
  lockPeriodDays: number;
  minDeposit: string;
  maxCapacity: string;
  active: boolean;
}

/**
 * A liquidity pool position
 */
export interface LiquidityPoolPosition {
  id: string;
  userId: string;
  poolId: string;
  depositedAmount: string;
  lpTokens: string;
  currentValue: string;
  pendingRewards: string;
  claimedRewards: string;
  impermanentLoss: number;     // Estimated IL %
  netApy: number;
  startedAt: Date;
  lockEndsAt?: Date;
  status: 'active' | 'locked' | 'unlocking' | 'exited';
}

/**
 * DeFi yield farming opportunity
 */
export interface YieldFarmingOpportunity {
  id: string;
  protocol: string;            // e.g., "TON DeFi v2"
  poolName: string;
  assets: string[];
  currentApy: number;
  boostedApy: number;
  tvl: string;
  rewardTokens: string[];
  minInvestment: string;
  riskLevel: 'low' | 'medium' | 'high';
  verified: boolean;
  integrationStatus: 'live' | 'coming_soon' | 'deprecated';
}

/**
 * DeFi integration health
 */
export interface DeFiIntegrationHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  activeStakingPools: number;
  totalLiquidityProvided: string;
  totalYieldGenerated: string;
  activeFarmers: number;
  averageApy: number;
}

// ============================================================================
// Developer Incentive Layer Types
// ============================================================================

/**
 * Types of developer incentives
 */
export type DeveloperIncentiveType =
  | 'ecosystem_grant'           // Direct grant from ecosystem fund
  | 'growth_mining'             // Rewards for driving platform growth
  | 'agent_creation_reward'     // Rewards for creating high-quality agents
  | 'bug_bounty'                // Rewards for finding and fixing bugs
  | 'referral_reward'           // Rewards for referring new developers
  | 'hackathon_prize';          // Hackathon competition prizes

/**
 * A developer incentive record
 */
export interface DeveloperIncentive {
  id: string;
  developerId: string;
  type: DeveloperIncentiveType;
  amount: string;
  vestingSchedule?: IncentiveVestingSchedule;
  criteria: string[];           // What was achieved to earn this
  status: 'pending' | 'active' | 'vesting' | 'claimed' | 'expired';
  awardedAt: Date;
  claimableAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Vesting schedule for incentive rewards
 */
export interface IncentiveVestingSchedule {
  totalAmount: string;
  cliffDays: number;
  vestingDays: number;
  immediatePercent: number;     // % immediately claimable
  vestedAmount: string;
  claimedAmount: string;
  nextVestingDate?: Date;
  nextVestingAmount?: string;
}

/**
 * Developer metrics for incentive tracking
 */
export interface DeveloperMetrics {
  developerId: string;
  agentsPublished: number;
  activeAgents: number;
  totalAum: string;             // Total AUM managed by their agents
  totalUsersServed: number;
  revenueGenerated: string;
  reputationScore: number;
  incentivesEarned: string;
  incentivesPending: string;
  tier: DeveloperTier;
  joinedAt: Date;
}

/**
 * Developer tiers based on contribution
 */
export type DeveloperTier = 'newcomer' | 'contributor' | 'builder' | 'expert' | 'core';

/**
 * Developer incentive program health
 */
export interface DeveloperIncentiveProgramHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  activeDevelopers: number;
  totalIncentivesDistributed: string;
  pendingIncentives: string;
  averageIncentivePerDeveloper: string;
  programBudgetRemaining: string;
  developersByTier: Record<DeveloperTier, number>;
}

// ============================================================================
// Institutional Token Utility Types
// ============================================================================

/**
 * Institutional access level
 */
export type InstitutionalAccessLevel =
  | 'standard'      // Basic institutional features
  | 'premium'       // Advanced analytics and AI tools
  | 'enterprise'    // Full suite with dedicated support
  | 'sovereign';    // Custom arrangements

/**
 * Institutional token utility configuration
 */
export interface InstitutionalTokenUtility {
  institutionId: string;
  accessLevel: InstitutionalAccessLevel;
  governanceParticipation: boolean;
  treasuryCoInvestment: boolean;
  premiumAiToolsAccess: boolean;
  dedicatedSupportTier: string;
  customFeeArrangement?: CustomFeeArrangement;
  coInvestmentAllocation?: string;  // Amount in co-investment pool
  votingPowerMultiplier: number;    // Voting power multiplier for large stakers
  reportingFrequency: 'daily' | 'weekly' | 'monthly';
  complianceLevel: 'standard' | 'enhanced' | 'full';
}

/**
 * Custom fee arrangement for institutional clients
 */
export interface CustomFeeArrangement {
  institutionId: string;
  baseDiscount: number;         // 0-1 base fee discount
  volumeDiscountTiers: VolumeDiscountTier[];
  revenueShareback: number;     // 0-1 portion of fees shared back
  minimumVolume: string;        // Minimum monthly volume for arrangement
  validUntil: Date;
}

/**
 * Volume-based discount tier
 */
export interface VolumeDiscountTier {
  minMonthlyVolume: string;
  discountPercent: number;      // 0-1
}

// ============================================================================
// Economic Simulation & Modeling Types
// ============================================================================

/**
 * Economic simulation parameters
 */
export interface EconomicSimulationParams {
  simulationId: string;
  name: string;
  durationDays: number;
  initialTokenPrice: number;
  initialCirculatingSupply: string;
  initialStakingRate: number;      // 0-1, % of supply staked
  initialActiveAgents: number;
  scenarioType: EconomicScenarioType;
  parameters: EconomicScenarioParameters;
}

/**
 * Economic scenario types for simulation
 */
export type EconomicScenarioType =
  | 'base_case'                // Normal growth conditions
  | 'bull_market'              // Optimistic growth scenario
  | 'bear_market'              // Pessimistic downturn scenario
  | 'mass_adoption'            // Rapid user growth scenario
  | 'market_crash'             // Severe market correction
  | 'mass_unstaking'           // Large-scale unstaking event
  | 'protocol_exploit'         // Security exploit scenario
  | 'regulatory_action';       // Regulatory intervention scenario

/**
 * Parameters for each economic scenario
 */
export interface EconomicScenarioParameters {
  agentGrowthRate: number;         // Monthly agent growth rate
  userGrowthRate: number;          // Monthly user growth rate
  tokenPriceVolatility: number;    // Daily price volatility
  stakingYieldMultiplier: number;  // Yield multiplier for this scenario
  feeRevenueMultiplier: number;    // Fee revenue multiplier
  churnRate: number;               // Monthly user churn rate
  additionalShocks?: EconomicShock[];
}

/**
 * An economic shock event in simulation
 */
export interface EconomicShock {
  dayOfOccurrence: number;
  type: 'price_crash' | 'user_surge' | 'fee_spike' | 'slashing_wave' | 'liquidity_crisis';
  magnitude: number;               // -1 to 1, negative = bad, positive = good
  durationDays: number;
}

/**
 * Economic simulation result
 */
export interface EconomicSimulationResult {
  simulationId: string;
  params: EconomicSimulationParams;
  dailySnapshots: EconomicDaySnapshot[];
  summary: EconomicSimulationSummary;
  stressTestResults?: StressTestResult[];
  generatedAt: Date;
}

/**
 * Daily snapshot of economic metrics during simulation
 */
export interface EconomicDaySnapshot {
  day: number;
  tokenPrice: number;
  circulatingSupply: string;
  stakedSupply: string;
  stakingRate: number;
  activeAgents: number;
  activeUsers: number;
  dailyVolume: string;
  dailyRevenue: string;
  treasuryBalance: string;
  tokenVelocity: number;
  inflationRate: number;
}

/**
 * Summary statistics of an economic simulation
 */
export interface EconomicSimulationSummary {
  finalTokenPrice: number;
  priceChange: number;            // % change from initial
  finalCirculatingSupply: string;
  supplyChange: number;           // % change from initial
  finalStakingRate: number;
  stakingRateChange: number;
  totalRevenueGenerated: string;
  totalTokensBurned: string;
  finalTreasuryBalance: string;
  averageTokenVelocity: number;
  peakActiveAgents: number;
  sustainabilityScore: number;    // 0-100, long-term sustainability
  recommendations: string[];
}

/**
 * Result of an economic stress test
 */
export interface StressTestResult {
  scenarioName: string;
  description: string;
  initialState: Partial<EconomicDaySnapshot>;
  finalState: Partial<EconomicDaySnapshot>;
  maxDrawdown: number;
  recoveryDays: number;
  systemCollapse: boolean;        // Whether the system reached collapse
  vulnerabilities: string[];
  mitigations: string[];
}

/**
 * Token velocity model output
 */
export interface TokenVelocityModel {
  currentVelocity: number;         // Times per year token changes hands
  targetVelocity: number;          // Optimal velocity range
  velocityDrivers: VelocityDriver[];
  stabilizationMechanisms: string[];
  recommendation: 'increase_utility' | 'reduce_velocity' | 'stable';
}

/**
 * Factor influencing token velocity
 */
export interface VelocityDriver {
  factor: string;
  contribution: number;            // -1 to 1, negative = reduces velocity
  description: string;
}

// ============================================================================
// Cross-Agent Payment Network Types
// ============================================================================

/**
 * A cross-agent payment channel
 */
export interface AgentPaymentChannel {
  id: string;
  agentA: string;
  agentB: string;
  capacity: string;                // Total channel capacity in tokens
  agentABalance: string;
  agentBBalance: string;
  status: 'open' | 'active' | 'closing' | 'closed' | 'disputed';
  openedAt: Date;
  lastActivityAt: Date;
  totalTransactions: number;
  totalVolume: string;
}

/**
 * An autonomous workflow between multiple agents
 */
export interface AgentAutonomousWorkflow {
  id: string;
  name: string;
  description: string;
  participatingAgents: string[];
  coordinator?: string;            // Optional coordinator agent
  steps: WorkflowStep[];
  status: 'draft' | 'active' | 'paused' | 'completed' | 'failed';
  totalCost: string;
  totalRevenue: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

/**
 * A step in an autonomous agent workflow
 */
export interface WorkflowStep {
  id: string;
  agentId: string;
  action: string;
  inputCost: string;               // Tokens paid to execute this step
  outputRevenue: string;           // Tokens earned from this step
  dependsOn: string[];             // Step IDs this depends on
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  executedAt?: Date;
}

/**
 * Agent economic network graph
 */
export interface AgentEconomicNetwork {
  nodes: AgentNetworkNode[];
  edges: AgentNetworkEdge[];
  totalNetworkValue: string;
  totalDailyVolume: string;
  networkHealth: number;           // 0-100 health score
  centralityScores: Record<string, number>; // Per-agent centrality
}

/**
 * A node in the agent economic network
 */
export interface AgentNetworkNode {
  agentId: string;
  role: 'producer' | 'consumer' | 'router' | 'coordinator';
  tokenBalance: string;
  dailyVolume: string;
  connections: number;
  reputation: number;
}

/**
 * An edge (payment relationship) in the network
 */
export interface AgentNetworkEdge {
  fromAgentId: string;
  toAgentId: string;
  dailyVolume: string;
  transactionCount: number;
  relationship: 'service' | 'data' | 'compute' | 'governance';
}

/**
 * A payment request between agents
 */
export interface CrossAgentPaymentRequest {
  fromAgentId: string;
  toAgentId: string;
  amount: string;
  purpose: AgentTransactionType;
  metadata?: Record<string, unknown>;
  requiresApproval?: boolean;
}

/**
 * Result of a cross-agent payment
 */
export interface CrossAgentPaymentResult {
  success: boolean;
  transactionId: string;
  fromAgentId: string;
  toAgentId: string;
  amount: string;
  fee: string;
  netAmount: string;
  timestamp: Date;
  reason?: string;
}

// ============================================================================
// Overall Economy Configuration & Health Types
// ============================================================================

/**
 * Configuration for the Token Utility & Agent Economy layer
 */
export interface TokenUtilityEconomyConfig {
  tokenSymbol: string;
  tokenDecimals: number;
  totalSupply: string;
  feeSchedule?: Partial<Record<TokenFeeType, Partial<FeeScheduleEntry>>>;
  tiers?: Partial<Record<TokenUtilityTier, Partial<TokenUtilityTierConfig>>>;
  revenueSharing?: Partial<RevenueSharingConfig>;
  buyback?: Partial<BuybackConfig>;
  simulation?: Partial<EconomicSimulationParams>;
}

/**
 * Overall health of the Token Utility & Agent Economy layer
 */
export interface TokenUtilityEconomyHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  tokenUtilityFramework: 'healthy' | 'degraded' | 'critical';
  agentStaking: 'healthy' | 'degraded' | 'critical';
  agentEconomy: 'healthy' | 'degraded' | 'critical';
  revenueSharing: 'healthy' | 'degraded' | 'critical';
  buybackBurn: 'healthy' | 'degraded' | 'critical';
  defiIntegration: 'healthy' | 'degraded' | 'critical';
  developerIncentives: 'healthy' | 'degraded' | 'critical';
  crossAgentPayments: 'healthy' | 'degraded' | 'critical';
  totalValueLocked: string;
  totalActiveAgents: number;
  totalDevelopers: number;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Types of events emitted by the Token Utility & Agent Economy layer
 */
export type TokenUtilityEconomyEventType =
  | 'fee.collected'
  | 'fee.burned'
  | 'tier.upgraded'
  | 'tier.downgraded'
  | 'agent.staked'
  | 'agent.slashed'
  | 'agent.trust_updated'
  | 'economy.transaction'
  | 'revenue.distributed'
  | 'buyback.executed'
  | 'tokens.burned'
  | 'liquidity.added'
  | 'liquidity.removed'
  | 'yield.distributed'
  | 'incentive.awarded'
  | 'incentive.claimed'
  | 'payment.cross_agent'
  | 'workflow.created'
  | 'workflow.completed'
  | 'simulation.completed';

/**
 * An event emitted by the Token Utility & Agent Economy layer
 */
export interface TokenUtilityEconomyEvent {
  id: string;
  type: TokenUtilityEconomyEventType;
  data: Record<string, unknown>;
  agentId?: string;
  userId?: string;
  timestamp: Date;
}

/**
 * Callback for Token Utility & Agent Economy events
 */
export type TokenUtilityEconomyEventCallback = (event: TokenUtilityEconomyEvent) => void;
