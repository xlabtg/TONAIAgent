/**
 * TONAIAgent - Agent Launchpad Type Definitions
 *
 * Core types for the Agent Launchpad enabling DAOs, funds, and communities
 * to deploy autonomous treasury and investment agents on The Open Network.
 */

// ============================================================================
// Organization Types
// ============================================================================

export type OrganizationType =
  | 'dao'
  | 'crypto_fund'
  | 'hedge_fund'
  | 'venture_fund'
  | 'family_office'
  | 'treasury'
  | 'community'
  | 'protocol'
  | 'startup'
  | 'enterprise';

export type OrganizationStatus =
  | 'pending_setup'
  | 'active'
  | 'paused'
  | 'suspended'
  | 'archived';

export interface Organization {
  id: string;
  name: string;
  description: string;
  type: OrganizationType;
  status: OrganizationStatus;
  governanceConfig: GovernanceConfig;
  treasuryConfig: TreasuryConfig;
  members: OrganizationMember[];
  agents: string[]; // Agent IDs
  pools: string[]; // Capital pool IDs
  compliance: OrganizationCompliance;
  monetization: OrganizationMonetization;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  email: string;
  name: string;
  role: OrganizationRole;
  permissions: MemberPermissions;
  votingPower: number;
  joinedAt: Date;
  status: 'active' | 'suspended' | 'removed';
  metadata: Record<string, unknown>;
}

export type OrganizationRole =
  | 'owner'
  | 'admin'
  | 'treasury_manager'
  | 'strategy_manager'
  | 'risk_manager'
  | 'contributor'
  | 'viewer';

export interface MemberPermissions {
  canManageAgents: boolean;
  canManageTreasury: boolean;
  canManageMembers: boolean;
  canCreateProposals: boolean;
  canVote: boolean;
  canExecuteStrategies: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  maxCapitalAllocation?: number;
}

export interface OrganizationCompliance {
  kycRequired: boolean;
  accreditedOnly: boolean;
  jurisdictionRestrictions: string[];
  auditEnabled: boolean;
  auditFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  lastAuditDate?: Date;
}

export interface OrganizationMonetization {
  managementFeePercent: number;
  performanceFeePercent: number;
  highWaterMark: boolean;
  feeRecipient: string;
  revenueShareEnabled: boolean;
  revenueShareConfig?: RevenueShareConfig;
}

export interface RevenueShareConfig {
  contributorShare: number; // percentage
  platformShare: number;
  treasuryShare: number;
  vestingPeriodDays: number;
}

// ============================================================================
// Treasury Agent Types
// ============================================================================

export type TreasuryAgentType =
  | 'treasury'
  | 'investment'
  | 'liquidity'
  | 'risk'
  | 'yield'
  | 'hedging'
  | 'diversification';

export type TreasuryAgentStatus =
  | 'draft'
  | 'pending_approval'
  | 'deploying'
  | 'active'
  | 'paused'
  | 'stopped'
  | 'error'
  | 'archived';

export interface TreasuryAgent {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  type: TreasuryAgentType;
  status: TreasuryAgentStatus;
  config: TreasuryAgentConfig;
  strategy: TreasuryStrategy;
  performance: TreasuryAgentPerformance;
  riskControls: AgentRiskControls;
  governance: AgentGovernance;
  auditTrail: AuditEntry[];
  createdAt: Date;
  updatedAt: Date;
  deployedAt?: Date;
  lastExecutionAt?: Date;
  metadata: Record<string, unknown>;
}

export interface TreasuryAgentConfig {
  walletAddress: string;
  capitalAllocated: number;
  maxCapital: number;
  autoRebalance: boolean;
  rebalanceInterval: number; // in minutes
  allowedTokens: string[];
  allowedProtocols: string[];
  executionMode: 'automatic' | 'approval_required' | 'simulation_only';
  gasSettings: GasSettings;
}

export interface GasSettings {
  maxGasPrice: number;
  priorityFee: number;
  autoAdjust: boolean;
}

export interface TreasuryStrategy {
  type: StrategyType;
  allocationRules: AllocationRule[];
  rebalancingThreshold: number; // percentage deviation
  yieldTargetApy?: number;
  diversificationRules: DiversificationRule[];
  customParameters: Record<string, unknown>;
}

export type StrategyType =
  | 'yield_optimization'
  | 'stable_preservation'
  | 'growth_focused'
  | 'balanced'
  | 'custom';

export interface AllocationRule {
  id: string;
  name: string;
  targetPercent: number;
  minPercent: number;
  maxPercent: number;
  assetClass: AssetClass;
  specificAssets?: string[];
  rebalanceAction: 'auto' | 'manual' | 'proposal';
}

export type AssetClass =
  | 'stablecoin'
  | 'native_token'
  | 'yield_bearing'
  | 'liquidity_position'
  | 'governance_token'
  | 'nft'
  | 'other';

export interface DiversificationRule {
  maxSingleAssetPercent: number;
  maxProtocolExposure: number;
  minAssetCount: number;
  correlationThreshold?: number;
}

export interface TreasuryAgentPerformance {
  totalValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  realizedPnl: number;
  unrealizedPnl: number;
  yieldGenerated: number;
  currentApy: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  totalTransactions: number;
  successfulTransactions: number;
  holdings: Holding[];
  performanceHistory: PerformanceDataPoint[];
  lastUpdated: Date;
}

export interface Holding {
  token: string;
  symbol: string;
  amount: number;
  valueInTon: number;
  percentOfTotal: number;
  protocol?: string;
  isYieldBearing: boolean;
  currentApy?: number;
}

export interface PerformanceDataPoint {
  timestamp: Date;
  totalValue: number;
  pnl: number;
  pnlPercent: number;
  apy: number;
  drawdown: number;
}

// ============================================================================
// Risk Controls Types
// ============================================================================

export interface AgentRiskControls {
  enabled: boolean;
  maxDrawdown: number;
  maxSingleTradePercent: number;
  dailyLossLimit: number;
  concentrationLimit: number;
  liquidityRequirements: LiquidityRequirements;
  emergencyStopConditions: EmergencyStopCondition[];
  approvalThresholds: ApprovalThreshold[];
}

export interface LiquidityRequirements {
  minLiquidPercent: number;
  minLiquidAmount: number;
  liquidAssets: string[];
}

export interface EmergencyStopCondition {
  id: string;
  type: 'drawdown' | 'volatility' | 'loss' | 'anomaly' | 'custom';
  threshold: number;
  action: 'pause' | 'stop' | 'alert' | 'reduce_exposure';
  cooldownMinutes: number;
}

export interface ApprovalThreshold {
  type: 'single_transaction' | 'daily_total' | 'protocol_change' | 'strategy_change';
  amount: number;
  requiredApprovals: number;
  approverRoles: OrganizationRole[];
}

// ============================================================================
// Governance Types
// ============================================================================

export interface GovernanceConfig {
  type: GovernanceType;
  votingPeriodHours: number;
  quorumPercent: number;
  approvalThresholdPercent: number;
  vetoEnabled: boolean;
  vetoThresholdPercent: number;
  timelockHours: number;
  delegationEnabled: boolean;
  executionDelay: number; // in minutes
}

export type GovernanceType =
  | 'multisig'
  | 'token_voting'
  | 'quadratic_voting'
  | 'conviction_voting'
  | 'hybrid';

export interface AgentGovernance {
  proposalRequired: boolean;
  autoExecute: boolean;
  strategyChangeRequiresVote: boolean;
  riskParameterChangeRequiresVote: boolean;
  recentProposals: GovernanceProposal[];
  executedProposals: string[];
}

export interface GovernanceProposal {
  id: string;
  organizationId: string;
  agentId?: string;
  type: ProposalType;
  title: string;
  description: string;
  proposer: string;
  status: ProposalStatus;
  actions: ProposalAction[];
  votingStart: Date;
  votingEnd: Date;
  votes: Vote[];
  quorumReached: boolean;
  approved: boolean;
  executedAt?: Date;
  executionTxHash?: string;
  createdAt: Date;
}

export type ProposalType =
  | 'strategy_change'
  | 'allocation_change'
  | 'risk_parameter_change'
  | 'agent_deployment'
  | 'agent_pause'
  | 'agent_stop'
  | 'member_addition'
  | 'member_removal'
  | 'fee_change'
  | 'emergency_action'
  | 'capital_allocation'
  | 'withdrawal'
  | 'custom';

export type ProposalStatus =
  | 'draft'
  | 'active'
  | 'passed'
  | 'failed'
  | 'executed'
  | 'cancelled'
  | 'expired';

export interface ProposalAction {
  type: string;
  target: string;
  parameters: Record<string, unknown>;
  value?: number;
}

export interface Vote {
  id: string;
  proposalId: string;
  voter: string;
  votingPower: number;
  support: 'for' | 'against' | 'abstain';
  reason?: string;
  timestamp: Date;
}

// ============================================================================
// Treasury Management Types
// ============================================================================

export interface TreasuryConfig {
  multiSigRequired: boolean;
  multiSigThreshold: number;
  signers: string[];
  withdrawalLimits: WithdrawalLimits;
  inboundRules: InboundRule[];
  outboundRules: OutboundRule[];
}

export interface WithdrawalLimits {
  dailyLimit: number;
  singleTransactionLimit: number;
  monthlyLimit: number;
  cooldownMinutes: number;
  requiresApproval: boolean;
  approvalThreshold: number;
}

export interface InboundRule {
  id: string;
  type: 'whitelist' | 'any' | 'kyc_required';
  allowedSources?: string[];
  minAmount?: number;
  maxAmount?: number;
  autoProcess: boolean;
}

export interface OutboundRule {
  id: string;
  type: 'whitelist' | 'governance_only' | 'agent_only';
  allowedDestinations?: string[];
  maxAmount?: number;
  requiresApproval: boolean;
  cooldownMinutes: number;
}

// ============================================================================
// Capital Pool Types
// ============================================================================

export interface CapitalPool {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  type: CapitalPoolType;
  status: CapitalPoolStatus;
  totalCapital: number;
  availableCapital: number;
  allocatedCapital: number;
  reservedCapital: number;
  contributors: PoolContributor[];
  allocations: CapitalAllocation[];
  limits: PoolLimits;
  performance: PoolPerformance;
  createdAt: Date;
  updatedAt: Date;
}

export type CapitalPoolType =
  | 'general'
  | 'investment'
  | 'liquidity'
  | 'reserve'
  | 'operational';

export type CapitalPoolStatus = 'open' | 'closed' | 'paused' | 'liquidating';

export interface PoolContributor {
  id: string;
  userId: string;
  poolId: string;
  contribution: number;
  sharePercent: number;
  unrealizedPnl: number;
  realizedPnl: number;
  withdrawable: number;
  lockedUntil?: Date;
  joinedAt: Date;
  lastContributionAt: Date;
  status: 'active' | 'exiting' | 'exited';
}

export interface CapitalAllocation {
  id: string;
  poolId: string;
  agentId: string;
  amount: number;
  maxAmount: number;
  percentOfPool: number;
  purpose: string;
  status: 'active' | 'pending' | 'withdrawn';
  allocatedAt: Date;
  lastRebalanceAt?: Date;
}

export interface PoolLimits {
  maxCapital: number;
  minContribution: number;
  maxContribution: number;
  maxContributors: number;
  maxAllocationPercent: number;
  reserveRatio: number;
  lockPeriodDays: number;
  withdrawalNoticeDays: number;
}

export interface PoolPerformance {
  totalReturns: number;
  returnsPercent: number;
  allTimeHigh: number;
  allTimeLow: number;
  sharpeRatio: number;
  maxDrawdown: number;
  avgMonthlyReturn: number;
  volatility: number;
  lastUpdated: Date;
}

// ============================================================================
// Fund Infrastructure Types
// ============================================================================

export interface ManagedFund {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  type: FundType;
  status: FundStatus;
  strategy: FundStrategy;
  aum: number; // Assets Under Management
  nav: number; // Net Asset Value per share
  totalShares: number;
  investors: FundInvestor[];
  agents: string[];
  performance: FundPerformance;
  fees: FundFees;
  compliance: FundCompliance;
  createdAt: Date;
  updatedAt: Date;
  inceptionDate: Date;
}

export type FundType =
  | 'hedge_fund'
  | 'venture_fund'
  | 'index_fund'
  | 'yield_fund'
  | 'balanced_fund'
  | 'custom';

export type FundStatus =
  | 'fundraising'
  | 'deployed'
  | 'active'
  | 'paused'
  | 'redeeming'
  | 'closed';

export interface FundStrategy {
  name: string;
  description: string;
  type: StrategyType;
  targetApy: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  allocationStrategy: AllocationRule[];
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

export interface FundInvestor {
  id: string;
  userId: string;
  fundId: string;
  shares: number;
  sharePercent: number;
  investedCapital: number;
  currentValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  status: 'active' | 'redeeming' | 'exited';
  investedAt: Date;
  lastActivityAt: Date;
  lockExpiry?: Date;
}

export interface FundPerformance {
  totalReturns: number;
  returnsYtd: number;
  returns1y: number;
  returns3y: number;
  returnsInception: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  volatility: number;
  beta?: number;
  alpha?: number;
  trackingError?: number;
  informationRatio?: number;
  navHistory: NavDataPoint[];
  lastUpdated: Date;
}

export interface NavDataPoint {
  date: Date;
  nav: number;
  aum: number;
  change: number;
  changePercent: number;
}

export interface FundFees {
  managementFeePercent: number;
  performanceFeePercent: number;
  entryFeePercent: number;
  exitFeePercent: number;
  highWaterMark: number;
  hurdleRate?: number;
  feesAccrued: number;
  feesCollected: number;
  lastFeeCollection: Date;
}

export interface FundCompliance {
  accreditedOnly: boolean;
  minInvestment: number;
  maxInvestors: number;
  lockPeriodDays: number;
  redemptionNoticeDays: number;
  redemptionFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  kycRequired: boolean;
  jurisdictionRestrictions: string[];
}

// ============================================================================
// Monitoring & Analytics Types
// ============================================================================

export interface LaunchpadDashboard {
  organizationId: string;
  overview: DashboardOverview;
  treasuryMetrics: TreasuryMetrics;
  agentMetrics: AgentMetrics;
  capitalMetrics: CapitalMetrics;
  governanceMetrics: GovernanceMetrics;
  riskMetrics: RiskMetrics;
  alerts: DashboardAlert[];
  lastUpdated: Date;
}

export interface DashboardOverview {
  totalAum: number;
  totalPnl: number;
  totalPnlPercent: number;
  activeAgents: number;
  activeProposals: number;
  pendingActions: number;
  healthScore: number;
}

export interface TreasuryMetrics {
  totalValue: number;
  liquidAssets: number;
  allocatedAssets: number;
  yieldGenerated: number;
  currentApy: number;
  topHoldings: Holding[];
  allocationBreakdown: AllocationBreakdown[];
  recentTransactions: TreasuryTransaction[];
}

export interface AllocationBreakdown {
  category: string;
  value: number;
  percent: number;
  change24h: number;
}

export interface TreasuryTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'swap' | 'stake' | 'unstake' | 'claim' | 'fee';
  amount: number;
  token: string;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
  txHash?: string;
  agentId?: string;
}

export interface AgentMetrics {
  totalAgents: number;
  activeAgents: number;
  pausedAgents: number;
  errorAgents: number;
  totalCapitalManaged: number;
  avgPerformance: number;
  topPerformers: AgentSummary[];
  recentActivity: AgentActivity[];
}

export interface AgentSummary {
  id: string;
  name: string;
  type: TreasuryAgentType;
  status: TreasuryAgentStatus;
  capitalManaged: number;
  pnl: number;
  pnlPercent: number;
}

export interface AgentActivity {
  agentId: string;
  agentName: string;
  type: string;
  description: string;
  timestamp: Date;
  impact?: number;
}

export interface CapitalMetrics {
  totalPooled: number;
  totalContributors: number;
  avgContribution: number;
  totalAllocated: number;
  allocationEfficiency: number;
  inflowsLast30d: number;
  outflowsLast30d: number;
  netFlow: number;
}

export interface GovernanceMetrics {
  totalProposals: number;
  activeProposals: number;
  passedProposals: number;
  failedProposals: number;
  avgParticipation: number;
  avgApprovalRate: number;
  recentProposals: ProposalSummary[];
}

export interface ProposalSummary {
  id: string;
  title: string;
  type: ProposalType;
  status: ProposalStatus;
  votesFor: number;
  votesAgainst: number;
  participation: number;
  endsAt: Date;
}

export interface RiskMetrics {
  overallRiskScore: number;
  portfolioVar: number;
  maxDrawdownCurrent: number;
  concentrationRisk: number;
  liquidityRisk: number;
  protocolExposure: ProtocolExposure[];
  riskTrend: 'improving' | 'stable' | 'worsening';
  topRisks: RiskItem[];
}

export interface ProtocolExposure {
  protocol: string;
  exposure: number;
  exposurePercent: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface RiskItem {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

export interface DashboardAlert {
  id: string;
  type: AlertType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
  actionRequired: boolean;
  action?: AlertAction;
}

export type AlertType =
  | 'risk_threshold'
  | 'performance_alert'
  | 'governance_action'
  | 'agent_error'
  | 'capital_event'
  | 'compliance_issue'
  | 'system_event';

export interface AlertAction {
  type: 'review' | 'approve' | 'pause' | 'stop' | 'investigate';
  targetId: string;
  targetType: 'agent' | 'proposal' | 'pool' | 'organization';
}

// ============================================================================
// Audit Trail Types
// ============================================================================

export interface AuditEntry {
  id: string;
  timestamp: Date;
  actor: string;
  actorType: 'user' | 'agent' | 'system' | 'governance';
  action: AuditAction;
  target: string;
  targetType: string;
  details: Record<string, unknown>;
  outcome: 'success' | 'failure' | 'pending';
  metadata: Record<string, unknown>;
}

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'deploy'
  | 'pause'
  | 'resume'
  | 'stop'
  | 'execute'
  | 'allocate'
  | 'withdraw'
  | 'vote'
  | 'approve'
  | 'reject';

// ============================================================================
// Event Types
// ============================================================================

export type LaunchpadEventType =
  | 'organization_created'
  | 'organization_updated'
  | 'member_added'
  | 'member_removed'
  | 'agent_deployed'
  | 'agent_started'
  | 'agent_paused'
  | 'agent_stopped'
  | 'agent_error'
  | 'pool_created'
  | 'capital_contributed'
  | 'capital_withdrawn'
  | 'capital_allocated'
  | 'proposal_created'
  | 'proposal_voted'
  | 'proposal_executed'
  | 'risk_alert'
  | 'performance_update'
  | 'rebalance_executed'
  | 'fee_collected'
  | 'emergency_stop';

export interface LaunchpadEvent {
  id: string;
  type: LaunchpadEventType;
  organizationId: string;
  agentId?: string;
  timestamp: Date;
  data: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  metadata: Record<string, unknown>;
}

export type LaunchpadEventCallback = (event: LaunchpadEvent) => void;
