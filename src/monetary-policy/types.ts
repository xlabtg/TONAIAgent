/**
 * TONAIAgent - AI Monetary Policy & Treasury Layer Types (Issue #123)
 *
 * Core types for the AI Monetary Policy & Treasury Layer, implementing
 * programmable central bank functionality with AI-driven emission control,
 * treasury capital allocation, stability-linked incentives, and DAO monetary
 * governance on The Open Network.
 */

// ============================================================================
// Treasury Reserve Types
// ============================================================================

/**
 * Sources of treasury revenue
 */
export type TreasuryRevenueSource =
  | 'performance_fees'      // Fees from AI fund performance
  | 'marketplace_fees'      // Marketplace transaction fees
  | 'rwa_yield'             // Real-world asset yield
  | 'prime_brokerage'       // Prime brokerage revenue
  | 'token_issuance'        // Revenue from token issuance
  | 'staking_yield'         // Staking rewards
  | 'protocol_fees';        // General protocol fees

/**
 * Categories of protocol reserves
 */
export type ReserveCategory =
  | 'liquidity_buffer'      // Short-term liquidity
  | 'insurance_fund'        // Insurance against losses
  | 'strategic_capital'     // Long-term strategic investments
  | 'stabilization_fund'    // Ecosystem stability
  | 'protocol_reserves';    // Core protocol reserves

/**
 * A protocol treasury reserve pool
 */
export interface ProtocolReserve {
  id: string;
  category: ReserveCategory;
  name: string;
  balanceTon: number;
  targetAllocationPercent: number;
  currentAllocationPercent: number;
  minBalanceTon: number;
  sources: TreasuryRevenueSource[];
  lastUpdated: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Protocol treasury revenue entry
 */
export interface TreasuryRevenue {
  id: string;
  source: TreasuryRevenueSource;
  amount: number;
  assetSymbol: string;
  valueInTon: number;
  timestamp: Date;
  description: string;
  txHash?: string;
}

/**
 * Treasury health and composition snapshot
 */
export interface TreasurySnapshot {
  id: string;
  totalValueTon: number;
  reserves: ProtocolReserve[];
  liquidityRatio: number;       // Ratio of liquid assets to total
  coverageRatio: number;        // Reserve coverage vs. total protocol exposure
  growthRate30d: number;        // 30-day growth rate
  revenueRate30d: number;       // 30-day revenue rate (TON/day)
  snapshotAt: Date;
}

// ============================================================================
// AI Monetary Policy Engine Types
// ============================================================================

/**
 * Inputs used by the AI Monetary Policy Engine for decision-making
 */
export interface MonetaryPolicyInputs {
  stabilityIndex: number;         // From Systemic Risk & Stability Framework (#122)
  liquidityDepth: number;         // From Institutional Liquidity Network (#119)
  clearingExposure: number;       // From AI-native Clearing House (#120)
  marketVolatility: number;       // Current market volatility (0-1)
  protocolGrowthRate: number;     // Protocol TVL growth rate (annualized)
  currentEmissionRate: number;    // Current token emission rate (tokens/day)
  tokenPrice: number;             // Current token price in TON
  stakingParticipation: number;   // % of circulating supply staked
  treasuryValueTon: number;       // Total treasury value in TON
  circulatingSupply: number;      // Current circulating token supply
  timestamp: Date;
}

/**
 * Outputs / recommendations from the AI Monetary Policy Engine
 */
export interface MonetaryPolicyOutputs {
  id: string;
  inputs: MonetaryPolicyInputs;
  emissionAdjustment: EmissionAdjustment;
  stakingYieldChange: StakingYieldChange;
  treasuryReallocation: TreasuryReallocationPlan;
  riskWeightAdjustments: RiskWeightAdjustment[];
  policyRationale: string;
  confidence: number;             // 0-1 confidence score
  generatedAt: Date;
  expiresAt: Date;
  requiresGovernanceApproval: boolean;
}

/**
 * Recommended emission adjustment
 */
export interface EmissionAdjustment {
  currentRate: number;            // tokens/day
  recommendedRate: number;        // tokens/day
  adjustmentPercent: number;      // % change
  direction: 'increase' | 'decrease' | 'maintain';
  mechanism: EmissionMechanism;
  burnAmount?: number;            // tokens to burn (if burning)
  rationale: string;
}

/**
 * Emission control mechanisms
 */
export type EmissionMechanism =
  | 'inflation'       // Increase supply during growth
  | 'deflation'       // Reduce supply during stress
  | 'burn'            // Burn tokens during high profitability
  | 'incentive_boost' // Boost incentives for liquidity gaps
  | 'stable';         // Maintain current rate

/**
 * Staking yield change recommendation
 */
export interface StakingYieldChange {
  currentYieldPercent: number;
  recommendedYieldPercent: number;
  changePercent: number;
  tierAdjustments: TierYieldAdjustment[];
  effectiveDate: Date;
  rationale: string;
}

/**
 * Per-tier staking yield adjustment
 */
export interface TierYieldAdjustment {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  currentYield: number;
  recommendedYield: number;
}

/**
 * Treasury reallocation plan
 */
export interface TreasuryReallocationPlan {
  id: string;
  actions: TreasuryReallocationAction[];
  totalReallocated: number;
  expectedYieldImprovement: number;
  expectedRiskReduction: number;
  rationale: string;
}

/**
 * A single treasury reallocation action
 */
export interface TreasuryReallocationAction {
  fromCategory: ReserveCategory;
  toCategory: ReserveCategory;
  amount: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Risk weight adjustment for assets/strategies
 */
export interface RiskWeightAdjustment {
  targetId: string;           // Strategy or asset ID
  targetType: 'strategy' | 'asset' | 'protocol';
  targetName: string;
  currentWeight: number;
  recommendedWeight: number;
  adjustmentReason: string;
}

// ============================================================================
// Adaptive Emission Controller Types
// ============================================================================

/**
 * Current emission state
 */
export interface EmissionState {
  currentDailyRate: number;        // tokens/day
  currentInflationRate: number;    // annualized %
  totalMinted: number;             // total tokens ever minted
  totalBurned: number;             // total tokens burned
  netCirculating: number;          // minted - burned
  emissionPhase: EmissionPhase;
  phaseSince: Date;
  nextReviewAt: Date;
}

/**
 * Economic phases for emission control
 */
export type EmissionPhase =
  | 'growth'     // Expansionary — inflation to incentivize participation
  | 'stress'     // Contractionary — deflation to stabilize
  | 'profit'     // Profitable — burn excess tokens
  | 'gap'        // Liquidity gap — boost incentives
  | 'stable';    // Balanced — maintain emission rate

/**
 * Emission event record
 */
export interface EmissionEvent {
  id: string;
  type: 'mint' | 'burn' | 'adjust';
  amount: number;
  mechanism: EmissionMechanism;
  triggerReason: string;
  policyOutputId?: string;
  executedAt: Date;
  txHash?: string;
}

/**
 * Emission control configuration
 */
export interface EmissionControlConfig {
  baseDailyRate: number;           // Base emission rate (tokens/day)
  maxDailyRate: number;            // Maximum allowed rate
  minDailyRate: number;            // Minimum allowed rate (0 = deflation allowed)
  maxAdjustmentPercent: number;    // Max % change per adjustment
  adjustmentFrequencyDays: number; // How often adjustments can occur
  burnEnabled: boolean;            // Whether burn mechanism is active
  maxBurnPercent: number;          // Max % of daily emission to burn
  phaseThresholds: PhaseThresholds;
}

/**
 * Thresholds for transitioning between emission phases
 */
export interface PhaseThresholds {
  growthStabilityIndex: number;    // Stability index for growth phase
  stressVolatility: number;        // Volatility threshold for stress phase
  profitMargin: number;            // Protocol profit margin for burn phase
  liquidityGapDepth: number;       // Liquidity depth below which gap phase triggers
}

// ============================================================================
// Treasury Capital Allocation Engine Types
// ============================================================================

/**
 * Types of treasury capital deployments
 */
export type CapitalDeploymentType =
  | 'insurance_backstop'   // Backstop insurance fund
  | 'liquidity_injection'  // Inject liquidity into pools
  | 'fund_seeding'         // Seed new AI funds
  | 'rwa_onboarding'       // Support RWA onboarding
  | 'stabilization'        // Stabilization capital
  | 'strategic_investment' // Strategic co-investment
  | 'protocol_upgrade';    // Fund protocol upgrades

/**
 * A treasury capital deployment request
 */
export interface CapitalDeploymentRequest {
  id: string;
  type: CapitalDeploymentType;
  requestedAmount: number;
  targetId: string;
  targetName: string;
  rationale: string;
  expectedReturn?: number;
  expectedImpact: string;
  requester: string;
  urgency: 'critical' | 'high' | 'normal' | 'low';
  requiredApproval: 'ai_auto' | 'governance_vote' | 'multisig';
  requestedAt: Date;
}

/**
 * Result of a capital deployment
 */
export interface CapitalDeploymentResult {
  deploymentId: string;
  requestId: string;
  type: CapitalDeploymentType;
  deployedAmount: number;
  targetId: string;
  status: 'executed' | 'pending_approval' | 'rejected' | 'failed';
  approvalId?: string;
  executedAt?: Date;
  txHash?: string;
  reason?: string;
}

/**
 * Treasury capital allocation configuration
 */
export interface CapitalAllocationConfig {
  maxAutoDeployPercent: number;        // Max % AI can deploy without governance
  requireGovernanceAbovePercent: number;
  emergencyDeployEnabled: boolean;
  maxEmergencyDeployPercent: number;
  allocationLimits: Record<CapitalDeploymentType, number>; // Max % per type
  coInvestmentEnabled: boolean;
  maxCoInvestmentPercent: number;
}

// ============================================================================
// Stability-Linked Incentive System Types
// ============================================================================

/**
 * Protocol stability factors feeding into incentive computation
 */
export interface StabilityFactors {
  stabilityScore: number;       // 0-100 overall stability score
  liquidityDepthScore: number;  // 0-100 liquidity depth score
  riskExposureScore: number;    // 0-100 risk exposure score (lower = safer)
  agentPerformanceScore: number;// 0-100 average agent performance score
}

/**
 * Incentive multiplier computed from stability factors
 */
export interface IncentiveMultiplier {
  base: number;                   // Base multiplier (1.0 = normal)
  stabilityBonus: number;         // Bonus for high stability
  liquidityBonus: number;         // Bonus for deep liquidity
  riskPenalty: number;            // Penalty for high risk
  performanceBonus: number;       // Bonus for good agent performance
  effective: number;              // Final effective multiplier
  computedAt: Date;
}

/**
 * Reward tier based on stability-linked incentives
 */
export interface StabilityRewardTier {
  tier: 'conservative' | 'balanced' | 'growth' | 'aggressive';
  description: string;
  baseYieldBoost: number;         // Additional yield % for this behavior tier
  requirements: {
    maxDrawdown: number;
    minHoldingPeriodDays: number;
    minCapitalEfficiency: number;
  };
  active: boolean;
}

// ============================================================================
// Monetary Governance Layer Types
// ============================================================================

/**
 * Types of monetary proposals
 */
export type MonetaryProposalType =
  | 'emission_adjustment'     // Change emission rate or mechanism
  | 'yield_adjustment'        // Change staking yield parameters
  | 'treasury_reallocation'   // Reallocate treasury funds
  | 'reserve_policy_change'   // Change reserve policies
  | 'incentive_adjustment'    // Adjust stability-linked incentives
  | 'capital_deployment'      // Deploy capital from treasury
  | 'emergency_monetary_action'; // Emergency monetary intervention

/**
 * Status of a monetary proposal through its lifecycle
 */
export type MonetaryProposalStatus =
  | 'ai_analysis'    // AI is analyzing and forming recommendation
  | 'pending_vote'   // Waiting for DAO vote
  | 'voting'         // DAO vote in progress
  | 'approved'       // Approved by DAO
  | 'rejected'       // Rejected by DAO
  | 'executing'      // Smart contract execution in progress
  | 'executed'       // Successfully executed
  | 'expired'        // Expired without execution
  | 'emergency';     // Emergency override activated

/**
 * A monetary governance proposal
 */
export interface MonetaryProposal {
  id: string;
  type: MonetaryProposalType;
  title: string;
  description: string;
  aiRecommendation: MonetaryPolicyOutputs;
  proposer: string;
  status: MonetaryProposalStatus;
  votingStartsAt?: Date;
  votingEndsAt?: Date;
  executionEta?: Date;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  totalVotingPower: number;
  quorum: number;
  threshold: number;
  executedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Emergency monetary override
 */
export interface EmergencyMonetaryOverride {
  id: string;
  type: 'emission_pause' | 'emission_reduce' | 'treasury_freeze' | 'yield_cap';
  triggeredBy: string;
  reason: string;
  parameters: Record<string, unknown>;
  active: boolean;
  triggeredAt: Date;
  expiresAt?: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// ============================================================================
// Layer Configuration & Health Types
// ============================================================================

/**
 * Configuration for the AI Monetary Policy & Treasury Layer
 */
export interface MonetaryPolicyConfig {
  emissionControl: EmissionControlConfig;
  capitalAllocation: CapitalAllocationConfig;
  governanceEnabled: boolean;
  votingPeriodDays: number;
  timelockDays: number;
  aiAutonomyLevel: 'minimal' | 'moderate' | 'high';  // How much AI can act without governance
  stabilityLinkedIncentives: boolean;
  emergencyOverrideEnabled: boolean;
}

/**
 * Health status of the Monetary Policy Layer
 */
export interface MonetaryPolicyHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  treasuryVault: 'healthy' | 'degraded' | 'critical';
  monetaryEngine: 'healthy' | 'degraded' | 'critical';
  emissionController: 'healthy' | 'degraded' | 'critical';
  capitalAllocator: 'healthy' | 'degraded' | 'critical';
  incentiveSystem: 'healthy' | 'degraded' | 'critical';
  governanceLayer: 'healthy' | 'degraded' | 'critical';
  activeEmergencyOverrides: number;
  pendingProposals: number;
  treasuryValueTon: number;
  currentDailyEmissionRate: number;
  currentStabilityScore: number;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Types of events emitted by the Monetary Policy Layer
 */
export type MonetaryPolicyEventType =
  | 'treasury.revenue_received'
  | 'treasury.capital_deployed'
  | 'treasury.reserve_rebalanced'
  | 'emission.adjusted'
  | 'emission.tokens_minted'
  | 'emission.tokens_burned'
  | 'emission.phase_changed'
  | 'staking.yield_adjusted'
  | 'incentive.multiplier_updated'
  | 'policy.recommendation_generated'
  | 'governance.proposal_created'
  | 'governance.vote_cast'
  | 'governance.proposal_executed'
  | 'emergency.override_triggered'
  | 'emergency.override_resolved';

/**
 * An event emitted by the Monetary Policy Layer
 */
export interface MonetaryPolicyEvent {
  type: MonetaryPolicyEventType;
  data: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Callback for monetary policy events
 */
export type MonetaryPolicyEventCallback = (event: MonetaryPolicyEvent) => void;
