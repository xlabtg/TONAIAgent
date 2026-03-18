/**
 * TONAIAgent - DAO Governance & Treasury Layer Types (Issue #103)
 *
 * Core types for the DAO Governance & Treasury Layer, enabling self-governing
 * AI financial protocols with on-chain treasury management, multi-tier voting,
 * AI-driven capital allocation, and institutional governance.
 */

// ============================================================================
// Governance Proposal Types
// ============================================================================

/**
 * Types of governance proposals supported by the DAO
 */
export type DaoProposalType =
  | 'strategy_approval'       // Approve/reject AI investment strategies
  | 'treasury_allocation'     // Allocate treasury funds to strategies
  | 'risk_parameter_change'   // Change risk governance parameters
  | 'marketplace_curation'    // Curate agent marketplace listings
  | 'protocol_upgrade'        // Upgrade protocol smart contracts
  | 'emergency_action'        // Emergency shutdown or circuit breaker
  | 'fee_change'              // Change protocol fee parameters
  | 'agent_whitelist'         // Add/remove agents from whitelist
  | 'governance_parameter';   // Change governance configuration

/**
 * Status of a DAO proposal in its lifecycle
 */
export type DaoProposalStatus =
  | 'pending'     // Created but voting not started
  | 'active'      // Voting in progress
  | 'succeeded'   // Quorum + threshold met
  | 'defeated'    // Quorum not met or threshold not reached
  | 'queued'      // Passed, waiting in timelock
  | 'executed'    // Successfully executed
  | 'expired'     // Timelock expired without execution
  | 'cancelled';  // Cancelled by proposer or governance

/**
 * Voting options for governance proposals
 */
export type DaoVoteType = 'for' | 'against' | 'abstain';

/**
 * On-chain action to be executed if proposal passes
 */
export interface DaoProposalAction {
  target: string;        // Contract address or module identifier
  value: number;         // TON value to send
  calldata: string;      // Encoded function call
  description: string;   // Human-readable description
}

/**
 * Input for creating a new DAO proposal
 */
export interface CreateDaoProposalInput {
  type: DaoProposalType;
  title: string;
  description: string;
  actions: DaoProposalAction[];
  proposer: string;
  metadata?: Record<string, unknown>;
}

/**
 * A governance proposal in the DAO
 */
export interface DaoProposal {
  id: string;
  type: DaoProposalType;
  title: string;
  description: string;
  actions: DaoProposalAction[];
  proposer: string;
  status: DaoProposalStatus;
  snapshotBlock: number;
  votingStartsAt: Date;
  votingEndsAt: Date;
  executionEta?: Date;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  totalVotingPower: number;
  quorum: number;
  threshold: number;
  executedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * A vote cast on a DAO proposal
 */
export interface DaoVote {
  proposalId: string;
  voter: string;
  voteType: DaoVoteType;
  votingPower: number;
  reason?: string;
  timestamp: Date;
  delegatedFrom?: string[];
}

/**
 * Result of a voting operation
 */
export interface DaoVoteResult {
  success: boolean;
  proposalId: string;
  voter: string;
  voteType: DaoVoteType;
  votingPower: number;
  newForVotes: number;
  newAgainstVotes: number;
  newAbstainVotes: number;
}

// ============================================================================
// Voting Power & Delegation Types
// ============================================================================

/**
 * Snapshot of voting power at a specific point in time
 */
export interface VotingPowerSnapshot {
  holder: string;
  power: number;
  snapshotAt: Date;
  snapshotBlock: number;
  source: 'direct' | 'delegated' | 'both';
  directPower: number;
  delegatedPower: number;
}

/**
 * A voting power delegation record
 */
export interface VotingDelegation {
  id: string;
  delegator: string;
  delegatee: string;
  power: number;
  proposalTypes?: DaoProposalType[];  // Null = all types
  expiresAt?: Date;
  createdAt: Date;
  revokedAt?: Date;
  active: boolean;
}

/**
 * Input for creating a delegation
 */
export interface CreateDelegationInput {
  delegator: string;
  delegatee: string;
  power: number;
  proposalTypes?: DaoProposalType[];
  expiresAt?: Date;
}

// ============================================================================
// Treasury Types
// ============================================================================

/**
 * Types of assets held in the treasury
 */
export type TreasuryAssetType = 'ton' | 'jetton' | 'nft' | 'lp_token' | 'other';

/**
 * Status of the treasury vault
 */
export type TreasuryVaultStatus = 'active' | 'locked' | 'emergency' | 'migrating';

/**
 * An asset held in the DAO treasury
 */
export interface TreasuryAsset {
  id: string;
  type: TreasuryAssetType;
  symbol: string;
  name: string;
  address?: string;
  balance: number;
  valueInTon: number;
  allocation: number;      // Percentage of total treasury
  lastUpdated: Date;
  metadata?: Record<string, unknown>;
}

/**
 * A treasury allocation to a strategy
 */
export interface TreasuryAllocation {
  id: string;
  strategyId: string;
  strategyName: string;
  allocatedAmount: number;
  allocatedPercent: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  riskScore: number;
  status: 'active' | 'paused' | 'exiting';
  allocatedAt: Date;
  lastRebalanced?: Date;
  approvedByProposalId?: string;
}

/**
 * Input for a treasury allocation request
 */
export interface TreasuryAllocationRequest {
  strategyId: string;
  strategyName: string;
  requestedAmount: number;
  requestedPercent: number;
  rationale: string;
  requester: string;
  riskAssessment?: TreasuryRiskAssessment;
}

/**
 * The DAO Treasury vault containing all assets and allocations
 */
export interface TreasuryVault {
  id: string;
  name: string;
  status: TreasuryVaultStatus;
  totalValueTon: number;
  availableValueTon: number;
  allocatedValueTon: number;
  assets: TreasuryAsset[];
  allocations: TreasuryAllocation[];
  yieldGenerated: number;
  yieldPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Treasury transaction record
 */
export interface TreasuryTransaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'allocation' | 'reallocation' | 'yield' | 'fee';
  amount: number;
  asset: string;
  fromAddress?: string;
  toAddress?: string;
  strategyId?: string;
  proposalId?: string;
  description: string;
  timestamp: Date;
  txHash?: string;
}

// ============================================================================
// Risk Governance Types
// ============================================================================

/**
 * Risk parameters governing the treasury and AI agents
 */
export interface TreasuryRiskParameters {
  maxSingleStrategyExposure: number;   // Max % to any single strategy
  maxTotalRiskyExposure: number;       // Max % in high-risk strategies
  maxDrawdownBeforePause: number;      // Max drawdown before auto-pause
  circuitBreakerThreshold: number;     // Drawdown threshold for circuit breaker
  emergencyExitThreshold: number;      // Threshold for emergency shutdown
  minLiquidityReserve: number;         // Min % kept liquid
  rebalanceThreshold: number;          // % deviation to trigger rebalance
  dailyWithdrawalLimit: number;        // Max % withdrawn per day
}

/**
 * Risk assessment for a treasury operation
 */
export interface TreasuryRiskAssessment {
  riskScore: number;           // 0-100 risk score
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  concentrationRisk: number;
  liquidityRisk: number;
  marketRisk: number;
  counterpartyRisk: number;
  recommendations: string[];
  warnings: string[];
  approvalRequired: boolean;
  assessedAt: Date;
}

/**
 * Status of the circuit breaker
 */
export interface CircuitBreakerState {
  triggered: boolean;
  triggeredAt?: Date;
  triggerReason?: string;
  triggeredBy?: string;
  drawdownAtTrigger?: number;
  resetAt?: Date;
  resetBy?: string;
}

/**
 * Emergency action that can be taken on the treasury
 */
export interface EmergencyAction {
  id: string;
  type: 'pause_allocations' | 'emergency_withdraw' | 'shutdown' | 'circuit_breaker';
  triggeredBy: string;
  reason: string;
  affectedStrategies: string[];
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// ============================================================================
// AI Treasury Management Types
// ============================================================================

/**
 * AI-driven recommendation for treasury rebalancing
 */
export interface AiRebalanceRecommendation {
  id: string;
  currentAllocations: Record<string, number>;
  recommendedAllocations: Record<string, number>;
  expectedImprovement: number;
  expectedRiskReduction: number;
  confidence: number;
  rationale: string;
  actions: TreasuryRebalanceAction[];
  generatedAt: Date;
  expiresAt: Date;
  requiresGovernanceApproval: boolean;
}

/**
 * A single rebalance action
 */
export interface TreasuryRebalanceAction {
  type: 'increase' | 'decrease' | 'exit' | 'enter';
  strategyId: string;
  strategyName: string;
  currentAmount: number;
  targetAmount: number;
  delta: number;
  deltaPercent: number;
  reason: string;
}

/**
 * AI treasury management configuration
 */
export interface AiTreasuryConfig {
  enabled: boolean;
  maxAutoAllocationPercent: number;    // Max AI can allocate without governance
  requireGovernanceAbovePercent: number; // Threshold requiring governance vote
  optimizationObjective: 'yield' | 'risk_adjusted' | 'stable' | 'growth';
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly' | 'dynamic';
  humanOverrideEnabled: boolean;
  emergencyOverrideEnabled: boolean;
}

// ============================================================================
// Security & Multi-Sig Types
// ============================================================================

/**
 * Multi-signature configuration for treasury operations
 */
export interface MultiSigConfig {
  required: number;           // Number of signatures required
  signers: string[];          // Authorized signers
  timelockDuration: number;   // Seconds for timelock delay
  emergencySigners: string[]; // Signers for emergency operations
  emergencyRequired: number;  // Signatures required for emergency
}

/**
 * A pending multi-sig operation
 */
export interface MultiSigOperation {
  id: string;
  type: 'treasury_transfer' | 'strategy_allocation' | 'parameter_change' | 'emergency';
  description: string;
  data: Record<string, unknown>;
  requiredSignatures: number;
  signatures: MultiSigSignature[];
  status: 'pending' | 'approved' | 'executed' | 'rejected' | 'expired';
  timelockEndsAt?: Date;
  createdAt: Date;
  createdBy: string;
  executedAt?: Date;
  expiresAt: Date;
}

/**
 * A signature on a multi-sig operation
 */
export interface MultiSigSignature {
  signer: string;
  signature: string;
  signedAt: Date;
  approved: boolean;
}

// ============================================================================
// Transparency & Reporting Types
// ============================================================================

/**
 * Treasury performance report
 */
export interface TreasuryReport {
  periodStart: Date;
  periodEnd: Date;
  totalValueStart: number;
  totalValueEnd: number;
  totalReturn: number;
  totalReturnPercent: number;
  yieldGenerated: number;
  feesCollected: number;
  allocationBreakdown: TreasuryAllocationReport[];
  topPerformers: string[];
  underperformers: string[];
  riskExposureSummary: RiskExposureSummary;
  governanceActivity: GovernanceActivitySummary;
  generatedAt: Date;
}

/**
 * Allocation report breakdown
 */
export interface TreasuryAllocationReport {
  strategyId: string;
  strategyName: string;
  allocatedAmount: number;
  currentValue: number;
  return: number;
  returnPercent: number;
  contributionToPortfolio: number;
}

/**
 * Risk exposure summary
 */
export interface RiskExposureSummary {
  totalRiskScore: number;
  highRiskExposure: number;
  mediumRiskExposure: number;
  lowRiskExposure: number;
  liquidityRatio: number;
  concentrationIndex: number;
}

/**
 * Governance activity summary
 */
export interface GovernanceActivitySummary {
  proposalsCreated: number;
  proposalsPassed: number;
  proposalsDefeated: number;
  proposalsExecuted: number;
  totalVotesCast: number;
  uniqueVoters: number;
  averageParticipationRate: number;
}

// ============================================================================
// Marketplace Governance Types
// ============================================================================

/**
 * A strategy listing in the DAO-governed marketplace
 */
export interface GovernedStrategyListing {
  strategyId: string;
  strategyName: string;
  developerAddress: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'suspended' | 'deprecated';
  approvalProposalId?: string;
  rejectionReason?: string;
  riskRating: 'low' | 'medium' | 'high';
  communityRating: number;
  totalAllocated: number;
  submittedAt: Date;
  reviewedAt?: Date;
  votes: StrategyVote[];
}

/**
 * Community vote on a strategy
 */
export interface StrategyVote {
  voter: string;
  rating: number;    // 1-5 stars
  comment?: string;
  timestamp: Date;
}

// ============================================================================
// Delegated & Institutional Governance Types
// ============================================================================

/**
 * An institutional delegate with specialized voting authority
 */
export interface InstitutionalDelegate {
  id: string;
  address: string;
  name: string;
  type: 'individual' | 'institution' | 'committee';
  delegatedPower: number;
  specializations: DaoProposalType[];
  tier: 'standard' | 'expert' | 'institutional';
  reputation: number;
  votingHistory: DelegateVotingRecord[];
  createdAt: Date;
  active: boolean;
}

/**
 * Voting record for a delegate
 */
export interface DelegateVotingRecord {
  proposalId: string;
  proposalType: DaoProposalType;
  vote: DaoVoteType;
  rationale?: string;
  timestamp: Date;
}

// ============================================================================
// DAO Layer Configuration & Health Types
// ============================================================================

/**
 * Configuration for the DAO Governance Layer
 */
export interface DaoGovernanceConfig {
  // Governance timing
  votingDelay: number;           // Blocks before voting starts
  votingPeriod: number;          // Blocks voting lasts
  proposalThreshold: number;     // Min voting power to create proposal
  quorumPercent: number;         // Min % of total supply to participate
  approvalThreshold: number;     // Min % of votes to pass (e.g., 51%)
  timelockDuration: number;      // Seconds in timelock after passing

  // Treasury settings
  treasuryMultiSig: MultiSigConfig;
  treasuryRiskParameters: TreasuryRiskParameters;
  aiTreasuryConfig: AiTreasuryConfig;

  // Governance paramters per proposal type
  proposalTypeConfigs: Partial<Record<DaoProposalType, ProposalTypeConfig>>;
}

/**
 * Per-proposal-type governance configuration
 */
export interface ProposalTypeConfig {
  quorumPercent: number;
  approvalThreshold: number;
  timelockDuration: number;
  votingPeriod: number;
  requiresMultiSig: boolean;
}

/**
 * Health status of the DAO Governance Layer
 */
export interface DaoGovernanceHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  governanceEngine: 'healthy' | 'degraded' | 'critical';
  treasuryVault: 'healthy' | 'degraded' | 'critical';
  riskGovernance: 'healthy' | 'degraded' | 'critical';
  multiSigLayer: 'healthy' | 'degraded' | 'critical';
  aiTreasury: 'healthy' | 'degraded' | 'critical';
  activeProposals: number;
  totalVaultValueTon: number;
  circuitBreakerActive: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Types of events emitted by the DAO Governance Layer
 */
export type DaoEventType =
  | 'proposal.created'
  | 'proposal.voted'
  | 'proposal.succeeded'
  | 'proposal.defeated'
  | 'proposal.queued'
  | 'proposal.executed'
  | 'proposal.cancelled'
  | 'delegation.created'
  | 'delegation.revoked'
  | 'treasury.deposited'
  | 'treasury.withdrawn'
  | 'treasury.allocated'
  | 'treasury.reallocated'
  | 'treasury.rebalanced'
  | 'risk.circuit_breaker_triggered'
  | 'risk.circuit_breaker_reset'
  | 'risk.emergency_action'
  | 'multisig.operation_created'
  | 'multisig.operation_signed'
  | 'multisig.operation_executed'
  | 'ai.rebalance_recommended'
  | 'marketplace.strategy_approved'
  | 'marketplace.strategy_rejected';

/**
 * An event emitted by the DAO Governance Layer
 */
export interface DaoEvent {
  type: DaoEventType;
  data: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Callback for DAO events
 */
export type DaoEventCallback = (event: DaoEvent) => void;
