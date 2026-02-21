/**
 * TONAIAgent - Token Strategy Type Definitions
 *
 * Core types for token launch strategy, liquidity flywheel,
 * valuation modeling, and tokenomics simulation.
 */

// ============================================================================
// Launch Strategy Types
// ============================================================================

export type LaunchPhase = 'private' | 'strategic' | 'community' | 'public';

export interface LaunchPhaseConfig {
  name: LaunchPhase;
  startDate?: Date;
  endDate?: Date;
  targetRaise: string; // In USD
  tokenPrice: string; // In USD
  allocation: string; // Token amount
  vestingCliff: number; // Days
  vestingDuration: number; // Days
  minInvestment?: string;
  maxInvestment?: string;
}

export interface LaunchConfig {
  totalSupply: string;
  initialCirculating: string;
  initialPrice: string;
  phases: LaunchPhaseConfig[];
  tge: TGEConfig;
  antiWhale: AntiWhaleConfig;
  launchIncentives: LaunchIncentiveConfig[];
}

export interface TGEConfig {
  date?: Date;
  initialMarketCap: string;
  initialFDV: string;
  dexLiquidity: string;
  priceFloor?: string;
  priceCeiling?: string;
}

export interface AntiWhaleConfig {
  maxWalletPercent: number;
  maxTransactionPercent: number;
  sellTaxFirstDays: number;
  sellTaxRate: number;
}

export interface LaunchIncentiveConfig {
  name: string;
  type: 'staking_bonus' | 'lp_boost' | 'referral' | 'competition';
  multiplier: number;
  duration: number; // Days
  allocation: string;
}

export interface LaunchProgress {
  currentPhase: LaunchPhase;
  phasesCompleted: LaunchPhase[];
  totalRaised: string;
  participantCount: number;
  tokensDistributed: string;
  nextMilestone?: string;
  completionPercent: number;
}

export interface TGESimulation {
  initialCirculating: string;
  initialMarketCap: string;
  initialFDV: string;
  expectedVolume24h: string;
  expectedPriceRange: {
    low: string;
    mid: string;
    high: string;
  };
  liquidityDepth: string;
  projectedStakingRatio: number;
}

// ============================================================================
// Liquidity Flywheel Types
// ============================================================================

export interface FlywheelConfig {
  phases: FlywheelPhaseConfig[];
  liquidityPools: LiquidityPoolConfig[];
  healthThresholds: LiquidityHealthThresholds;
  incentiveBudget: string;
}

export interface FlywheelPhaseConfig {
  name: string;
  durationMonths: number;
  emission: string;
  targetTVL: string;
}

export interface LiquidityPoolConfig {
  pair: string;
  baseAPY: number;
  boostMultiplier: number;
  minLockPeriod: number; // Days
  emissionShare: number; // 0-1
}

export interface LiquidityHealthThresholds {
  depthWarning: string;
  depthCritical: string;
  spreadWarning: number;
  spreadCritical: number;
  utilizationLow: number;
  utilizationHigh: number;
  concentrationWarning: number;
  concentrationCritical: number;
}

export interface FlywheelMetrics {
  currentPhase: string;
  totalValueLocked: string;
  liquidityDepth: string;
  averageSpread: number;
  utilization: number;
  topHolderConcentration: number;
  activeProviders: number;
  pendingRewards: string;
  distributedRewards: string;
  flywheelVelocity: number; // Measure of flywheel momentum
  healthScore: number; // 0-100
}

export interface LiquidityHealth {
  overall: 'healthy' | 'warning' | 'critical';
  depth: { value: string; status: 'ok' | 'warning' | 'critical' };
  spread: { value: number; status: 'ok' | 'warning' | 'critical' };
  utilization: { value: number; status: 'ok' | 'warning' | 'critical' };
  concentration: { value: number; status: 'ok' | 'warning' | 'critical' };
  recommendations: string[];
}

export interface FlywheelStage {
  stage: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
  metrics: {
    users: string;
    yield: string;
    liquidity: string;
    value: string;
    incentives: string;
  };
}

// ============================================================================
// Token Distribution Types
// ============================================================================

export interface DistributionConfig {
  allocations: AllocationConfig[];
  vestingSchedules: VestingScheduleConfig[];
  antiWhaleProtections: AntiWhaleConfig;
}

export interface AllocationConfig {
  category: AllocationCategory;
  percentage: number;
  amount: string;
  vestingScheduleId: string;
  description: string;
}

export type AllocationCategory =
  | 'community_rewards'
  | 'ecosystem_fund'
  | 'team'
  | 'advisors'
  | 'investors'
  | 'liquidity'
  | 'launch_incentives';

export interface VestingScheduleConfig {
  id: string;
  name: string;
  cliffDays: number;
  vestingDays: number;
  unlockPattern: 'linear' | 'monthly' | 'quarterly' | 'immediate' | 'accelerated';
  initialUnlockPercent: number;
}

export interface DistributionSnapshot {
  timestamp: Date;
  circulating: string;
  locked: string;
  staked: string;
  burned: string;
  byCategory: Record<AllocationCategory, {
    total: string;
    unlocked: string;
    locked: string;
    burned: string;
  }>;
}

// ============================================================================
// Valuation Model Types
// ============================================================================

export interface ValuationConfig {
  supplyModel: SupplyModelConfig;
  demandDrivers: DemandDriverConfig[];
  equilibriumTargets: EquilibriumTargets;
  burnMechanics: BurnMechanicsConfig;
}

export interface SupplyModelConfig {
  initialSupply: string;
  initialCirculating: string;
  yearlyEmissions: string[];
  emissionDecay: number; // Annual decay rate
  maxSupply?: string;
}

export interface DemandDriverConfig {
  name: string;
  weight: number; // 0-1
  growthRate: number; // Monthly growth assumption
  description: string;
}

export interface EquilibriumTargets {
  stakingRatio: number;
  liquidityRatio: number;
  burnRate: number;
  velocityTarget: number;
}

export interface BurnMechanicsConfig {
  transactionFee: number; // Percent of fees burned
  slashingBurn: number; // Percent of slashed tokens burned
  expiredGovernanceBurn: number;
  agentDecommissionBurn: number;
}

export interface ValuationMetrics {
  circulatingSupply: string;
  totalStaked: string;
  stakingRatio: number;
  totalBurned: string;
  burnRate: number;
  velocity: number;
  inflationRate: number;
  marketCap: string;
  fdv: string;
  price: string;
  priceChange24h: number;
  priceChange7d: number;
  priceChange30d: number;
}

export interface SupplyProjection {
  year: number;
  circulating: string;
  staked: string;
  liquid: string;
  totalBurned: string;
  inflationRate: number;
  projectedPrice?: string;
}

export interface EquilibriumAnalysis {
  currentState: {
    stakingRatio: number;
    liquidityRatio: number;
    burnRate: number;
    velocity: number;
  };
  targetState: EquilibriumTargets;
  gapAnalysis: {
    stakingGap: number;
    liquidityGap: number;
    burnGap: number;
    velocityGap: number;
  };
  recommendations: string[];
  estimatedTimeToEquilibrium: number; // Days
  sustainabilityScore: number; // 0-100
}

// ============================================================================
// Simulation Types
// ============================================================================

export interface SimulationConfig {
  initialSupply: string;
  initialCirculating: string;
  emissionSchedule: string[];
  burnRate: number;
  stakingTarget: number;
  growthAssumptions: GrowthAssumptions;
  scenarios: SimulationScenario[];
}

export interface GrowthAssumptions {
  userGrowthRate: number;
  tvlGrowthRate: number;
  revenueGrowthRate: number;
  adoptionCurve: 'linear' | 'exponential' | 's_curve';
}

export interface SimulationScenario {
  name: string;
  type: 'base' | 'bull' | 'bear' | 'stress';
  adjustments: {
    growthMultiplier: number;
    burnMultiplier: number;
    stakingMultiplier: number;
    priceVolatility: number;
  };
}

export interface SimulationParams {
  years: number;
  scenario: string;
  monteCarlo?: boolean;
  iterations?: number;
}

export interface SimulationResult {
  scenario: string;
  projections: YearlyProjection[];
  summary: SimulationSummary;
  confidence: ConfidenceInterval[];
}

export interface YearlyProjection {
  year: number;
  month?: number;
  circulating: string;
  staked: string;
  burned: string;
  price: string;
  marketCap: string;
  tvl: string;
  revenue: string;
  users: number;
  agents: number;
  stakingRatio: number;
  burnRate: number;
}

export interface SimulationSummary {
  finalCirculating: string;
  finalStaked: string;
  totalBurned: string;
  averageStakingRatio: number;
  peakPrice: string;
  troughPrice: string;
  sustainabilityScore: number;
  riskScore: number;
}

export interface ConfidenceInterval {
  year: number;
  metric: string;
  p10: string;
  p25: string;
  p50: string;
  p75: string;
  p90: string;
}

export interface StressScenario {
  name: string;
  trigger: string;
  priceImpact: number;
  stakingImpact: number;
  liquidityImpact: number;
  duration: number; // Days
}

export interface StressTestResult {
  scenario: string;
  survived: boolean;
  recoveryTime: number; // Days
  maxDrawdown: number;
  stakingRatioLow: number;
  liquidityRatioLow: number;
  circuitBreakersTriggered: string[];
  recommendations: string[];
}

// ============================================================================
// Governance Integration Types
// ============================================================================

export interface TokenGovernanceConfig {
  proposalThresholds: ProposalThresholdConfig[];
  votingPowerFormula: VotingPowerFormula;
  delegationRules: DelegationRules;
  councilConfig: CouncilConfig;
}

export interface ProposalThresholdConfig {
  type: string;
  quorum: number;
  threshold: number;
  timelock: number; // Days
  proposerRequirement: string;
}

export interface VotingPowerFormula {
  baseWeight: number;
  lockDurationMultiplier: number;
  maxLockBonus: number;
  delegationEnabled: boolean;
  reputationBonus: number;
}

export interface DelegationRules {
  liquidDelegation: boolean;
  multiDelegation: boolean;
  revocable: boolean;
  maxDelegatees: number;
}

export interface CouncilConfig {
  size: number;
  electionPeriod: number; // Days
  vetoThreshold: number;
  emergencyPowers: string[];
}

// ============================================================================
// Institutional Types
// ============================================================================

export interface InstitutionalConfig {
  stakingTiers: InstitutionalStakingTier[];
  complianceRequirements: ComplianceRequirement[];
  reportingSchedule: ReportingSchedule;
}

export interface InstitutionalStakingTier {
  name: string;
  minStake: string;
  lockPeriod: number; // Days
  rewardBoost: number;
  governance: boolean;
  reporting: 'daily' | 'weekly' | 'monthly';
  customTerms: boolean;
}

export interface ComplianceRequirement {
  type: 'kyc' | 'aml' | 'accreditation' | 'tax_reporting';
  required: boolean;
  provider?: string;
}

export interface ReportingSchedule {
  stakingReports: 'daily' | 'weekly' | 'monthly';
  taxReports: 'quarterly' | 'annual';
  auditReports: 'annual' | 'semi_annual';
}

// ============================================================================
// Event Types
// ============================================================================

export interface TokenStrategyEvent {
  id: string;
  timestamp: Date;
  type: TokenStrategyEventType;
  category: TokenStrategyEventCategory;
  data: Record<string, unknown>;
}

export type TokenStrategyEventType =
  | 'launch_phase_started'
  | 'launch_phase_completed'
  | 'tge_executed'
  | 'liquidity_added'
  | 'liquidity_removed'
  | 'flywheel_phase_changed'
  | 'health_alert'
  | 'equilibrium_reached'
  | 'stress_test_triggered'
  | 'simulation_completed'
  | 'distribution_executed'
  | 'burn_executed';

export type TokenStrategyEventCategory =
  | 'launch'
  | 'liquidity'
  | 'valuation'
  | 'simulation'
  | 'distribution'
  | 'governance';

export type TokenStrategyEventCallback = (event: TokenStrategyEvent) => void;

// ============================================================================
// Configuration Types
// ============================================================================

export interface TokenStrategyConfig {
  launch: LaunchConfig;
  flywheel: FlywheelConfig;
  distribution: DistributionConfig;
  valuation: ValuationConfig;
  simulation: SimulationConfig;
  governance: TokenGovernanceConfig;
  institutional: InstitutionalConfig;
}
