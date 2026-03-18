/**
 * TONAIAgent - AI Fund Manager Types
 *
 * Type definitions for the AI Fund Manager framework that enables creation
 * and management of AI-driven investment funds on the TON blockchain.
 */

// ============================================================================
// Fund Configuration Types
// ============================================================================

/**
 * Fund lifecycle states.
 * Transitions: pending -> active <-> paused -> closed
 *              active -> emergency_stopped
 */
export type FundLifecycleState =
  | 'pending'
  | 'active'
  | 'paused'
  | 'closed'
  | 'emergency_stopped';

/** Fund visibility and access type */
export type FundType = 'open' | 'private' | 'institutional';

/** Base asset for fund denomination */
export type FundBaseAsset = 'TON' | 'USDT' | 'USDC';

/** Risk profile of the fund */
export type FundRiskProfile = 'conservative' | 'moderate' | 'aggressive';

/** Strategy allocation entry — percentage weight given to a strategy */
export interface StrategyAllocation {
  /** Strategy ID from the marketplace */
  strategyId: string;
  /** Target weight in percent (0-100, all must sum to 100) */
  targetWeightPercent: number;
  /** Current actual weight in percent (may drift from target) */
  currentWeightPercent: number;
  /** Capital currently allocated to this strategy in base units */
  allocatedCapital: bigint;
  /** Last rebalanced timestamp */
  lastRebalancedAt?: Date;
}

/** Rebalancing trigger configuration */
export interface RebalancingRules {
  /** Rebalance when weight drifts by more than this percent */
  driftThresholdPercent: number;
  /** Minimum interval between rebalances in seconds */
  minIntervalSeconds: number;
  /** Maximum interval before a forced rebalance in seconds */
  maxIntervalSeconds: number;
  /** Whether to rebalance on volatility spike */
  rebalanceOnVolatility: boolean;
  /** Volatility threshold (annualized %) that triggers rebalance */
  volatilityThresholdPercent: number;
}

/** Fund configuration schema */
export interface FundConfig {
  /** Unique fund identifier */
  fundId: string;
  /** Human-readable fund name */
  name: string;
  /** Fund description */
  description: string;
  /** Creator identifier */
  creatorId: string;
  /** Fund type */
  type: FundType;
  /** Base asset for all capital accounting */
  baseAsset: FundBaseAsset;
  /** Strategy allocations (weights must sum to 100) */
  strategyAllocations: StrategyAllocation[];
  /** Risk profile */
  riskProfile: FundRiskProfile;
  /** Rebalancing rules */
  rebalancingRules: RebalancingRules;
  /** Minimum investment amount in base units */
  minInvestmentAmount: bigint;
  /** Maximum total fund size (0 = unlimited) */
  maxFundSize: bigint;
  /** Fee configuration */
  fees: FundFeeConfig;
  /** Creation timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

// ============================================================================
// Fee Configuration Types
// ============================================================================

/** Fee distribution beneficiary */
export interface FeeRecipient {
  /** Recipient identifier */
  recipientId: string;
  /** Type of recipient */
  recipientType: 'fund_creator' | 'strategy_developer' | 'platform_treasury';
  /** Share of fees received (percent, all must sum to 100) */
  sharePercent: number;
  /** TON wallet address for fee payments */
  walletAddress?: string;
}

/** Fund fee configuration */
export interface FundFeeConfig {
  /** Annual management fee in percent (e.g., 2.0 = 2%) */
  managementFeePercent: number;
  /** Performance fee taken from profits in percent (e.g., 20.0 = 20%) */
  performanceFeePercent: number;
  /** High-water mark — only charge performance fees on new all-time highs */
  highWaterMarkEnabled: boolean;
  /** Fee payment frequency in seconds */
  feePaymentIntervalSeconds: number;
  /** Distribution of fees among recipients */
  feeRecipients: FeeRecipient[];
}

// ============================================================================
// Investor Participation Types
// ============================================================================

/** Investor position in a fund */
export interface InvestorPosition {
  /** Position identifier */
  positionId: string;
  /** Fund this position belongs to */
  fundId: string;
  /** Investor identifier */
  investorId: string;
  /** Investor's TON wallet address */
  investorAddress: string;
  /** Capital invested in base units */
  capitalInvested: bigint;
  /** Current value of position in base units */
  currentValue: bigint;
  /** Fund shares held */
  sharesHeld: bigint;
  /** Entry net asset value per share */
  entryNavPerShare: bigint;
  /** Timestamp when position was opened */
  entryAt: Date;
  /** Accumulated management fees paid */
  managementFeesPaid: bigint;
  /** Accumulated performance fees paid */
  performanceFeesPaid: bigint;
  /** Whether position is active */
  isActive: boolean;
  /** Last update timestamp */
  lastUpdatedAt: Date;
}

/** Input for a capital deposit into a fund */
export interface DepositInput {
  /** Fund to deposit into */
  fundId: string;
  /** Investor identifier */
  investorId: string;
  /** Investor's wallet address */
  investorAddress: string;
  /** Amount to deposit in base units */
  amount: bigint;
}

/** Input for a capital withdrawal from a fund */
export interface WithdrawInput {
  /** Fund to withdraw from */
  fundId: string;
  /** Investor identifier */
  investorId: string;
  /** Amount to withdraw in base units (0 = full withdrawal) */
  amount: bigint;
}

/** Result of a deposit operation */
export interface DepositResult {
  /** Position identifier */
  positionId: string;
  /** Fund ID */
  fundId: string;
  /** Investor ID */
  investorId: string;
  /** Amount deposited */
  amountDeposited: bigint;
  /** Shares issued */
  sharesIssued: bigint;
  /** NAV per share at deposit */
  navPerShare: bigint;
  /** Timestamp */
  timestamp: Date;
}

/** Result of a withdrawal operation */
export interface WithdrawResult {
  /** Position identifier */
  positionId: string;
  /** Fund ID */
  fundId: string;
  /** Investor ID */
  investorId: string;
  /** Amount withdrawn */
  amountWithdrawn: bigint;
  /** Shares redeemed */
  sharesRedeemed: bigint;
  /** NAV per share at withdrawal */
  navPerShare: bigint;
  /** Realized profit/loss */
  realizedPnl: bigint;
  /** Fees charged on withdrawal */
  feesCharged: bigint;
  /** Timestamp */
  timestamp: Date;
}

// ============================================================================
// Portfolio Allocation Types
// ============================================================================

/** Current fund portfolio state */
export interface FundPortfolio {
  /** Fund ID */
  fundId: string;
  /** Total assets under management in base units */
  totalAum: bigint;
  /** Net asset value per share */
  navPerShare: bigint;
  /** Total shares outstanding */
  totalSharesOutstanding: bigint;
  /** Per-strategy breakdown */
  allocations: StrategyAllocation[];
  /** Cash held (unallocated capital) in base units */
  cashBalance: bigint;
  /** Last sync timestamp */
  lastSyncedAt: Date;
}

/** Result of an allocation operation */
export interface AllocationResult {
  /** Fund ID */
  fundId: string;
  /** Timestamp of allocation */
  timestamp: Date;
  /** Allocations applied */
  allocations: Array<{
    strategyId: string;
    amountAllocated: bigint;
    weightPercent: number;
  }>;
  /** Total capital allocated */
  totalAllocated: bigint;
  /** Any cash kept unallocated */
  cashRetained: bigint;
}

// ============================================================================
// Rebalancing Types
// ============================================================================

/** Reason a rebalancing was triggered */
export type RebalanceTrigger =
  | 'drift_threshold'
  | 'scheduled_interval'
  | 'volatility_spike'
  | 'risk_threshold'
  | 'manual';

/** A single rebalancing action — move capital between strategies */
export interface RebalancingAction {
  /** Strategy to reduce allocation from */
  fromStrategyId: string | 'cash';
  /** Strategy to increase allocation to */
  toStrategyId: string | 'cash';
  /** Amount to move in base units */
  amountToMove: bigint;
  /** New target weight for toStrategyId */
  newTargetWeightPercent: number;
}

/** Rebalancing execution plan */
export interface RebalancingPlan {
  /** Plan identifier */
  planId: string;
  /** Fund this plan is for */
  fundId: string;
  /** What triggered this rebalance */
  trigger: RebalanceTrigger;
  /** Actions to execute */
  actions: RebalancingAction[];
  /** Expected gas cost */
  estimatedGasCost: bigint;
  /** Plan created at */
  createdAt: Date;
}

/** Result of a completed rebalancing */
export interface RebalancingResult {
  /** Plan ID that was executed */
  planId: string;
  /** Fund ID */
  fundId: string;
  /** Whether all actions succeeded */
  success: boolean;
  /** Actions completed */
  actionsCompleted: number;
  /** Actions failed */
  actionsFailed: number;
  /** Gas used */
  gasUsed: bigint;
  /** New portfolio state after rebalancing */
  newPortfolio: FundPortfolio;
  /** Timestamp */
  completedAt: Date;
  /** Error if overall failure */
  error?: string;
}

// ============================================================================
// Risk Management Types
// ============================================================================

/** Fund-level risk limits */
export interface FundRiskLimits {
  /** Maximum percent of fund in any single strategy */
  maxStrategyExposurePercent: number;
  /** Maximum drawdown from peak before emergency stop (%) */
  maxDrawdownPercent: number;
  /** Maximum concentration in a single asset (%) */
  maxAssetConcentrationPercent: number;
  /** Daily loss limit — pause fund if exceeded (%) */
  dailyLossLimitPercent: number;
  /** Volatility window in days for rolling risk calculations */
  volatilityWindowDays: number;
}

/** Current risk status of a fund */
export interface FundRiskStatus {
  /** Fund ID */
  fundId: string;
  /** Current drawdown from peak (%) */
  currentDrawdownPercent: number;
  /** Peak AUM reached */
  peakAum: bigint;
  /** Daily PnL in base units */
  dailyPnl: bigint;
  /** Daily PnL as percent of AUM */
  dailyPnlPercent: number;
  /** Whether any risk limit is breached */
  isBreached: boolean;
  /** Which limits are breached */
  breachedLimits: string[];
  /** Risk score (0-100, higher = riskier) */
  riskScore: number;
  /** Last risk assessment timestamp */
  assessedAt: Date;
}

/** Emergency shutdown event */
export interface EmergencyShutdownEvent {
  /** Fund ID */
  fundId: string;
  /** Reason for shutdown */
  reason: string;
  /** Risk status at time of shutdown */
  riskStatus: FundRiskStatus;
  /** Timestamp */
  triggeredAt: Date;
}

// ============================================================================
// Performance Tracking Types
// ============================================================================

/** Fund performance metrics */
export interface FundPerformanceMetrics {
  /** Fund ID */
  fundId: string;
  /** Period this covers */
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  /** Total return (%) */
  totalReturnPercent: number;
  /** Annualized return (%) */
  annualizedReturnPercent: number;
  /** Sharpe ratio */
  sharpeRatio: number;
  /** Sortino ratio */
  sortinoRatio: number;
  /** Maximum drawdown (%) */
  maxDrawdownPercent: number;
  /** Win rate (% of profitable periods) */
  winRatePercent: number;
  /** Volatility (annualized %) */
  volatilityPercent: number;
  /** Total management fees collected */
  totalManagementFees: bigint;
  /** Total performance fees collected */
  totalPerformanceFees: bigint;
  /** Calculated at */
  calculatedAt: Date;
}

/** Snapshot of fund AUM at a point in time */
export interface AumSnapshot {
  /** Fund ID */
  fundId: string;
  /** AUM in base units */
  aum: bigint;
  /** NAV per share */
  navPerShare: bigint;
  /** Number of investors */
  investorCount: number;
  /** Timestamp */
  timestamp: Date;
}

// ============================================================================
// Fee Distribution Types
// ============================================================================

/** A single fee collection event */
export interface FeeCollectionEvent {
  /** Event identifier */
  eventId: string;
  /** Fund ID */
  fundId: string;
  /** Fee type */
  feeType: 'management' | 'performance';
  /** Total fee amount collected */
  totalAmount: bigint;
  /** Distribution breakdown */
  distributions: Array<{
    recipientId: string;
    recipientType: FeeRecipient['recipientType'];
    amount: bigint;
    sharePercent: number;
  }>;
  /** AUM at time of collection */
  aumAtCollection: bigint;
  /** High-water mark at time of collection (for performance fees) */
  highWaterMark?: bigint;
  /** Collected at */
  collectedAt: Date;
}

/** Accumulated fee earnings for a recipient */
export interface FeeEarnings {
  /** Recipient ID */
  recipientId: string;
  /** Fund ID */
  fundId: string;
  /** Total management fees earned */
  totalManagementFees: bigint;
  /** Total performance fees earned */
  totalPerformanceFees: bigint;
  /** Total fees earned */
  totalFees: bigint;
  /** Last payout timestamp */
  lastPayoutAt?: Date;
  /** Fees pending payout */
  pendingPayout: bigint;
}

// ============================================================================
// Fund Manager Configuration Types
// ============================================================================

/** Configuration for the AI Fund Manager */
export interface AIFundManagerConfig {
  /** Whether the fund manager is enabled */
  enabled: boolean;
  /** Maximum number of active funds */
  maxActiveFunds: number;
  /** Default risk limits applied to new funds */
  defaultRiskLimits: FundRiskLimits;
  /** Default rebalancing rules for new funds */
  defaultRebalancingRules: RebalancingRules;
  /** How many AUM snapshots to retain per fund */
  maxAumSnapshotsPerFund: number;
  /** How many performance records to retain per fund */
  maxPerformanceRecordsPerFund: number;
  /** Observability config */
  observability: {
    enableLogging: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

/** Fund manager metrics */
export interface FundManagerMetrics {
  /** Total funds created */
  totalFunds: number;
  /** Currently active funds */
  activeFunds: number;
  /** Total AUM across all funds */
  totalAum: bigint;
  /** Total investors across all funds */
  totalInvestors: number;
  /** Total rebalancings executed */
  totalRebalancings: number;
  /** Total fees collected */
  totalFeesCollected: bigint;
  /** Last updated */
  updatedAt: Date;
}

/** Fund manager health */
export interface FundManagerHealth {
  /** Overall health */
  overall: 'healthy' | 'degraded' | 'unhealthy';
  /** Whether the manager is running */
  running: boolean;
  /** Component health */
  components: {
    fundCreation: boolean;
    allocationEngine: boolean;
    rebalancingEngine: boolean;
    riskManagement: boolean;
    investorParticipation: boolean;
    performanceTracking: boolean;
    feeDistribution: boolean;
  };
  /** Metrics summary */
  metrics: FundManagerMetrics;
  /** Last health check */
  lastCheck: Date;
}

// ============================================================================
// Event Types
// ============================================================================

/** Fund manager event types */
export type FundManagerEventType =
  | 'fund.created'
  | 'fund.activated'
  | 'fund.paused'
  | 'fund.resumed'
  | 'fund.closed'
  | 'fund.emergency_stopped'
  | 'investor.deposited'
  | 'investor.withdrew'
  | 'allocation.executed'
  | 'rebalancing.triggered'
  | 'rebalancing.completed'
  | 'rebalancing.failed'
  | 'risk.limit_breached'
  | 'risk.emergency_stop'
  | 'fee.management_collected'
  | 'fee.performance_collected'
  | 'performance.snapshot_taken';

/** Fund manager event */
export interface FundManagerEvent {
  /** Event ID */
  id: string;
  /** Event type */
  type: FundManagerEventType;
  /** Related fund ID */
  fundId: string;
  /** Timestamp */
  timestamp: Date;
  /** Event payload */
  data: Record<string, unknown>;
}

/** Event handler callback */
export type FundManagerEventHandler = (event: FundManagerEvent) => void;

/** Unsubscribe function */
export type FundManagerUnsubscribe = () => void;

// ============================================================================
// Error Types
// ============================================================================

/** Error codes for fund manager operations */
export type FundManagerErrorCode =
  | 'FUND_NOT_FOUND'
  | 'FUND_ALREADY_EXISTS'
  | 'FUND_NOT_ACTIVE'
  | 'FUND_LIMIT_REACHED'
  | 'INVALID_FUND_STATE'
  | 'INVALID_ALLOCATION'
  | 'INVALID_WEIGHT_SUM'
  | 'MIN_INVESTMENT_NOT_MET'
  | 'MAX_FUND_SIZE_EXCEEDED'
  | 'INVESTOR_NOT_FOUND'
  | 'POSITION_NOT_FOUND'
  | 'INSUFFICIENT_BALANCE'
  | 'RISK_LIMIT_BREACHED'
  | 'REBALANCING_FAILED'
  | 'FEE_DISTRIBUTION_FAILED';

/** Structured error for fund manager operations */
export class FundManagerError extends Error {
  constructor(
    message: string,
    public readonly code: FundManagerErrorCode,
    public readonly metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FundManagerError';
  }
}
