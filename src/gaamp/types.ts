/**
 * TONAIAgent - Global Autonomous Asset Management Protocol (GAAMP) Types
 *
 * Core type definitions for the GAAMP protocol — an open, standardized,
 * protocol-level infrastructure for AI-managed asset management at global scale.
 *
 * GAAMP enables:
 * - Creation and operation of AI-managed funds
 * - On-chain clearing & settlement
 * - Cross-chain capital orchestration
 * - Institutional-grade compliance
 * - DAO-governed capital systems
 *
 * Protocol Version: 1.0
 */

// ============================================================================
// Primitive Types
// ============================================================================

export type ProtocolId = string;
export type AgentId = string;
export type FundId = string;
export type ParticipantId = string;
export type ProposalId = string;
export type TradeId = string;
export type SettlementId = string;
export type ChainId = string;
export type AssetId = string;
export type IdentityId = string;

// ============================================================================
// Protocol Constants
// ============================================================================

export const GAAMP_VERSION = '1.0.0' as const;

export const SUPPORTED_CHAINS: ChainId[] = [
  'ton',
  'ethereum',
  'polygon',
  'arbitrum',
  'solana',
  'avalanche',
  'bsc',
];

// ============================================================================
// Agent Layer Types
// ============================================================================

export type AgentType =
  | 'trading'
  | 'strategy'
  | 'risk'
  | 'treasury'
  | 'compliance'
  | 'data'
  | 'rebalancing';

export type AgentStatus =
  | 'registered'
  | 'active'
  | 'paused'
  | 'shutdown'
  | 'error';

export type AgentCapability =
  | 'allocate'
  | 'rebalance'
  | 'hedge'
  | 'report'
  | 'shutdown'
  | 'trade'
  | 'monitor'
  | 'govern';

/** Standardized Agent Interface v1 as defined in GAAMP spec */
export interface AgentInterfaceV1 {
  allocate(params: AllocateParams): Promise<AllocateResult>;
  rebalance(params: RebalanceParams): Promise<RebalanceResult>;
  hedge(params: HedgeParams): Promise<HedgeResult>;
  report(params: ReportParams): Promise<AgentReport>;
  shutdown(reason?: string): Promise<void>;
}

export interface AllocateParams {
  targetAllocations: Record<AssetId, number>;
  totalCapital: number;
  constraints?: AllocationConstraints;
}

export interface AllocationConstraints {
  minAllocation?: number;
  maxAllocation?: number;
  allowedAssets?: AssetId[];
  blockedAssets?: AssetId[];
  riskLimit?: number;
}

export interface AllocateResult {
  success: boolean;
  allocations: Record<AssetId, number>;
  executedAt: Date;
  message?: string;
}

export interface RebalanceParams {
  currentAllocations: Record<AssetId, number>;
  targetAllocations: Record<AssetId, number>;
  threshold?: number;
}

export interface RebalanceResult {
  success: boolean;
  trades: Array<{
    asset: AssetId;
    side: 'buy' | 'sell';
    amount: number;
  }>;
  executedAt: Date;
}

export interface HedgeParams {
  exposures: Record<AssetId, number>;
  targetNetExposure?: number;
  hedgingInstruments?: AssetId[];
}

export interface HedgeResult {
  success: boolean;
  hedges: Array<{
    asset: AssetId;
    size: number;
    instrument: AssetId;
  }>;
  netExposureAfter: number;
}

export interface ReportParams {
  reportType: AgentReportType;
  from?: Date;
  to?: Date;
}

export type AgentReportType =
  | 'performance'
  | 'risk'
  | 'allocation'
  | 'trades'
  | 'audit';

export interface AgentReport {
  agentId: AgentId;
  reportType: AgentReportType;
  generatedAt: Date;
  data: Record<string, unknown>;
  summary: string;
}

export interface ProtocolAgent {
  id: AgentId;
  name: string;
  type: AgentType;
  version: string;
  status: AgentStatus;
  capabilities: AgentCapability[];
  fundId?: FundId;
  registeredAt: Date;
  updatedAt: Date;
  metrics: AgentMetrics;
  config: AgentConfig;
}

export interface AgentMetrics {
  totalTrades: number;
  successfulTrades: number;
  totalAllocated: number;
  totalReturns: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  lastActiveAt?: Date;
}

export interface AgentConfig {
  maxCapital?: number;
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  allowedChains?: ChainId[];
  allowedAssets?: AssetId[];
  reportingFrequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';
  autoRebalance?: boolean;
  autoHedge?: boolean;
}

// ============================================================================
// Fund Layer Types
// ============================================================================

export type FundType =
  | 'tokenized'
  | 'dao'
  | 'institutional'
  | 'structured_product'
  | 'index'
  | 'hedge';

export type FundStatus =
  | 'draft'
  | 'registered'
  | 'active'
  | 'suspended'
  | 'closed'
  | 'liquidating';

export type FundClass =
  | 'retail'
  | 'accredited'
  | 'institutional'
  | 'dao_members';

export type RebalancingStrategy =
  | 'threshold'
  | 'calendar'
  | 'drift'
  | 'ai_driven';

export interface ProtocolFund {
  id: FundId;
  name: string;
  description: string;
  type: FundType;
  fundClass: FundClass;
  status: FundStatus;
  chain: ChainId;
  managingAgentIds: AgentId[];
  aum: number;
  currency: string;
  nav: number;
  navPerShare: number;
  totalShares: number;
  fees: FundFees;
  performance: FundPerformance;
  riskProfile: FundRiskProfile;
  rebalancingConfig: RebalancingConfig;
  registeredAt: Date;
  updatedAt: Date;
  config: FundConfig;
}

export interface FundFees {
  managementFeePercent: number;
  performanceFeePercent: number;
  entryFeePercent?: number;
  exitFeePercent?: number;
  highWaterMark?: number;
}

export interface FundPerformance {
  totalReturn: number;
  annualizedReturn?: number;
  ytdReturn: number;
  mtdReturn: number;
  sharpeRatio?: number;
  sortino?: number;
  maxDrawdown: number;
  calmarRatio?: number;
  volatility?: number;
  alpha?: number;
  beta?: number;
  trackingError?: number;
  informationRatio?: number;
  inceptionDate?: Date;
}

export interface FundRiskProfile {
  riskCategory: 'low' | 'medium' | 'high' | 'very_high';
  maxDrawdownLimit: number;
  maxLeverage: number;
  varLimit: number;
  concentrationLimit: number;
  liquidityMinimum: number;
}

export interface RebalancingConfig {
  strategy: RebalancingStrategy;
  thresholdPercent?: number;
  calendarFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  targetAllocations: Record<AssetId, number>;
  constraints?: AllocationConstraints;
}

export interface FundConfig {
  minInvestment?: number;
  maxInvestment?: number;
  lockupPeriodDays?: number;
  redemptionNoticeDays?: number;
  acceptedCurrencies?: string[];
  allowedJurisdictions?: string[];
  blockedJurisdictions?: string[];
  requiresKYC?: boolean;
  requiresAccreditation?: boolean;
}

export interface FundInvestment {
  id: string;
  fundId: FundId;
  participantId: ParticipantId;
  amount: number;
  sharesIssued: number;
  navAtInvestment: number;
  investedAt: Date;
  status: 'pending' | 'confirmed' | 'rejected';
}

export interface FundRedemption {
  id: string;
  fundId: FundId;
  participantId: ParticipantId;
  sharesRedeemed: number;
  redemptionValue: number;
  navAtRedemption: number;
  requestedAt: Date;
  settledAt?: Date;
  status: 'pending' | 'processing' | 'settled' | 'rejected';
}

// ============================================================================
// Prime & Liquidity Layer Types
// ============================================================================

export type LiquidityPoolType =
  | 'automated_market_maker'
  | 'orderbook'
  | 'rfq'
  | 'internal_netting'
  | 'cross_protocol';

export type LiquidityStatus =
  | 'active'
  | 'paused'
  | 'depleted'
  | 'rebalancing';

export type RoutingAlgorithm =
  | 'best_price'
  | 'least_slippage'
  | 'fastest_settlement'
  | 'lowest_fee'
  | 'ai_optimized';

export interface LiquidityPool {
  id: string;
  name: string;
  type: LiquidityPoolType;
  assets: AssetId[];
  totalLiquidity: number;
  availableLiquidity: number;
  utilizationRate: number;
  chain: ChainId;
  status: LiquidityStatus;
  apy: number;
  createdAt: Date;
}

export interface LiquidityRoute {
  id: string;
  fromAsset: AssetId;
  toAsset: AssetId;
  fromChain: ChainId;
  toChain: ChainId;
  amount: number;
  estimatedOutput: number;
  priceImpact: number;
  fees: number;
  hops: RouteHop[];
  estimatedTimeMs: number;
  algorithm: RoutingAlgorithm;
}

export interface RouteHop {
  poolId: string;
  fromAsset: AssetId;
  toAsset: AssetId;
  chain: ChainId;
  amount: number;
  output: number;
  fee: number;
  protocol: string;
}

export interface CapitalFlowRequest {
  requestId: string;
  sourceChain: ChainId;
  targetChain: ChainId;
  asset: AssetId;
  amount: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  initiatedBy: AgentId | FundId;
}

export interface CapitalFlowResult {
  requestId: string;
  success: boolean;
  actualAmount?: number;
  fees?: number;
  transactionHash?: string;
  settledAt?: Date;
  error?: string;
}

export interface InternalNettingResult {
  nettingId: string;
  grossPositions: number;
  netPositions: number;
  capitalFreed: number;
  tradesEliminated: number;
  nettedAt: Date;
}

// ============================================================================
// Clearing & Settlement Layer Types
// ============================================================================

export type ClearingStatus =
  | 'pending'
  | 'matching'
  | 'matched'
  | 'risk_check'
  | 'approved'
  | 'settling'
  | 'settled'
  | 'failed'
  | 'cancelled';

export type SettlementFinality =
  | 'probabilistic'
  | 'deterministic'
  | 'instant';

export type MarginType =
  | 'initial'
  | 'variation'
  | 'maintenance';

export interface ClearingRecord {
  id: string;
  tradeId: TradeId;
  buyerFundId: FundId;
  sellerFundId: FundId;
  asset: AssetId;
  quantity: number;
  price: number;
  notionalValue: number;
  chain: ChainId;
  status: ClearingStatus;
  marginRequired: number;
  marginPosted: number;
  submittedAt: Date;
  matchedAt?: Date;
  settledAt?: Date;
}

export interface SettlementRecord {
  id: SettlementId;
  clearingId: string;
  buyerFundId: FundId;
  sellerFundId: FundId;
  asset: AssetId;
  quantity: number;
  settlementAmount: number;
  chain: ChainId;
  transactionHash?: string;
  finality: SettlementFinality;
  status: 'pending' | 'confirmed' | 'finalized' | 'failed';
  initiatedAt: Date;
  confirmedAt?: Date;
  finalizedAt?: Date;
}

export interface DefaultResolutionResult {
  defaultingParty: FundId;
  exposureAmount: number;
  insuranceCoverage: number;
  netLoss: number;
  resolutionMethod: 'insurance_pool' | 'haircut' | 'auction' | 'backstop';
  resolvedAt: Date;
}

export interface MarginCall {
  id: string;
  fundId: FundId;
  marginType: MarginType;
  requiredMargin: number;
  postedMargin: number;
  deficit: number;
  deadline: Date;
  status: 'issued' | 'met' | 'defaulted';
  issuedAt: Date;
}

export interface NettingEngineResult {
  grossObligations: number;
  netObligations: number;
  efficiencyRate: number;
  participantNetPositions: Record<FundId, number>;
  eliminatedTrades: number;
  nettedAt: Date;
}

// ============================================================================
// Governance Layer Types
// ============================================================================

export type ProposalType =
  | 'parameter_change'
  | 'risk_threshold_update'
  | 'insurance_pool_adjustment'
  | 'protocol_upgrade'
  | 'agent_standard_update'
  | 'fund_standard_update'
  | 'fee_structure_change'
  | 'chain_onboarding'
  | 'emergency_action';

export type ProposalStatus =
  | 'draft'
  | 'submitted'
  | 'voting'
  | 'passed'
  | 'rejected'
  | 'executed'
  | 'expired'
  | 'cancelled';

export type VotingPower = number;

export interface GovernanceProposal {
  id: ProposalId;
  title: string;
  description: string;
  type: ProposalType;
  proposerId: ParticipantId;
  status: ProposalStatus;
  parameters: Record<string, unknown>;
  votingDeadline: Date;
  executionDelay?: number;
  quorumRequired: number;
  approvalThreshold: number;
  yesVotes: VotingPower;
  noVotes: VotingPower;
  abstainVotes: VotingPower;
  totalVotingPower: VotingPower;
  votes: Vote[];
  submittedAt: Date;
  executedAt?: Date;
}

export interface Vote {
  proposalId: ProposalId;
  voterId: ParticipantId;
  decision: 'yes' | 'no' | 'abstain';
  votingPower: VotingPower;
  rationale?: string;
  votedAt: Date;
}

export interface ProtocolParameters {
  maxAgentsPerFund: number;
  maxFundAUM: number;
  minMarginRatio: number;
  defaultLeverage: number;
  settlementWindow: number;
  defaultResolutionThreshold: number;
  insurancePoolReserveRatio: number;
  protocolFeePercent: number;
  governanceQuorum: number;
  governanceApprovalThreshold: number;
  votingPeriodDays: number;
  executionDelayDays: number;
}

export interface InsurancePool {
  id: string;
  name: string;
  totalReserves: number;
  availableReserves: number;
  claimedAmount: number;
  coverage: InsuranceCoverage[];
  fundedBy: ParticipantId[];
  updatedAt: Date;
}

export interface InsuranceCoverage {
  eventType: string;
  maxCoverage: number;
  deductible: number;
  premiumRate: number;
}

// ============================================================================
// Compliance & Identity Layer Types
// ============================================================================

export type KYCLevel =
  | 'none'
  | 'basic'
  | 'standard'
  | 'enhanced'
  | 'institutional';

export type AMLRiskLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'very_high';

export type InstitutionalType =
  | 'hedge_fund'
  | 'family_office'
  | 'bank'
  | 'pension_fund'
  | 'sovereign_wealth_fund'
  | 'endowment'
  | 'insurance_company'
  | 'broker_dealer'
  | 'asset_manager'
  | 'dao';

export type JurisdictionClass =
  | 'unrestricted'
  | 'permissioned'
  | 'restricted'
  | 'blocked';

export interface ProtocolParticipant {
  id: ParticipantId;
  name: string;
  type: 'individual' | 'institution' | 'dao' | 'agent';
  institutionalType?: InstitutionalType;
  kyc: KYCRecord;
  aml: AMLRecord;
  jurisdiction: JurisdictionRecord;
  permissions: ParticipantPermissions;
  registeredAt: Date;
  updatedAt: Date;
}

export interface KYCRecord {
  level: KYCLevel;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  verifiedAt?: Date;
  expiresAt?: Date;
  provider?: string;
  documentTypes: string[];
}

export interface AMLRecord {
  riskLevel: AMLRiskLevel;
  screenedAt?: Date;
  nextScreeningAt?: Date;
  sanctions: boolean;
  pep: boolean;
  adverseMedia: boolean;
  source?: string;
}

export interface JurisdictionRecord {
  primaryJurisdiction: string;
  additionalJurisdictions?: string[];
  jurisdictionClass: JurisdictionClass;
  regulatoryStatus?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
}

export interface ParticipantPermissions {
  canCreateFund: boolean;
  canDeployAgent: boolean;
  canVote: boolean;
  canProposeGovernance: boolean;
  allowedFundClasses: FundClass[];
  maxAUM?: number;
  tradingEnabled: boolean;
  crossChainEnabled: boolean;
}

export interface AuditTrailEntry {
  id: string;
  participantId: ParticipantId;
  action: string;
  entityType: 'fund' | 'agent' | 'trade' | 'governance' | 'compliance';
  entityId: string;
  details: Record<string, unknown>;
  chainId?: ChainId;
  transactionHash?: string;
  ipAddress?: string;
  timestamp: Date;
}

export interface ComplianceReport {
  id: string;
  fundId?: FundId;
  participantId?: ParticipantId;
  period: { from: Date; to: Date };
  jurisdiction: string;
  reportType: 'regulatory' | 'internal_audit' | 'risk_assessment';
  findings: ComplianceFinding[];
  generatedAt: Date;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
}

export interface ComplianceFinding {
  severity: 'info' | 'warning' | 'critical';
  category: string;
  description: string;
  recommendation?: string;
  regulatoryReference?: string;
}

// ============================================================================
// Cross-Chain Types
// ============================================================================

export type BridgeType =
  | 'lock_and_mint'
  | 'burn_and_mint'
  | 'atomic_swap'
  | 'liquidity_network';

export interface CrossChainBridge {
  id: string;
  sourceChain: ChainId;
  targetChain: ChainId;
  bridgeType: BridgeType;
  supportedAssets: AssetId[];
  minAmount: number;
  maxAmount: number;
  feePercent: number;
  estimatedTimeMs: number;
  isActive: boolean;
}

export interface CrossChainTransfer {
  id: string;
  bridgeId: string;
  sourceChain: ChainId;
  targetChain: ChainId;
  asset: AssetId;
  amount: number;
  sender: ParticipantId;
  recipient: ParticipantId;
  sourceTxHash?: string;
  targetTxHash?: string;
  status: 'pending' | 'in_flight' | 'completed' | 'failed';
  initiatedAt: Date;
  completedAt?: Date;
}

// ============================================================================
// Protocol Configuration
// ============================================================================

export interface GAMPConfig {
  version: string;
  chainId: ChainId;
  protocolParameters: Partial<ProtocolParameters>;
  agentLayer?: Partial<AgentLayerConfig>;
  fundLayer?: Partial<FundLayerConfig>;
  liquidityLayer?: Partial<LiquidityLayerConfig>;
  clearingLayer?: Partial<ClearingLayerConfig>;
  governanceLayer?: Partial<GovernanceLayerConfig>;
  complianceLayer?: Partial<ComplianceLayerConfig>;
}

export interface AgentLayerConfig {
  maxAgentsPerFund: number;
  agentRegistrationEnabled: boolean;
  autoShutdownOnRiskBreach: boolean;
  reportingFrequency: 'realtime' | 'hourly' | 'daily';
}

export interface FundLayerConfig {
  fundRegistrationEnabled: boolean;
  requiresGovernanceApproval: boolean;
  minFundSize: number;
  maxFundSize: number;
  allowedFundTypes: FundType[];
}

export interface LiquidityLayerConfig {
  enableInternalNetting: boolean;
  smartRoutingEnabled: boolean;
  crossChainEnabled: boolean;
  defaultRoutingAlgorithm: RoutingAlgorithm;
  maxSlippagePercent: number;
}

export interface ClearingLayerConfig {
  enableAINetting: boolean;
  settlementFinality: SettlementFinality;
  marginCallWindow: number;
  defaultResolutionEnabled: boolean;
  insurancePoolEnabled: boolean;
}

export interface GovernanceLayerConfig {
  daoEnabled: boolean;
  votingPeriodDays: number;
  quorumPercent: number;
  approvalThresholdPercent: number;
  executionDelayDays: number;
  emergencyActionsEnabled: boolean;
}

export interface ComplianceLayerConfig {
  kycRequired: boolean;
  amlScreeningEnabled: boolean;
  auditTrailEnabled: boolean;
  jurisdictionChecksEnabled: boolean;
  reportingEnabled: boolean;
}

// ============================================================================
// Protocol Events
// ============================================================================

export type GAMPEventType =
  | 'agent_registered'
  | 'agent_shutdown'
  | 'fund_created'
  | 'fund_closed'
  | 'investment_processed'
  | 'redemption_processed'
  | 'trade_cleared'
  | 'trade_settled'
  | 'default_resolved'
  | 'governance_proposal_created'
  | 'governance_vote_cast'
  | 'governance_proposal_executed'
  | 'parameter_updated'
  | 'participant_registered'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'margin_call_issued'
  | 'capital_routed'
  | 'bridge_transfer_completed'
  | 'risk_alert';

export interface GAMPEvent {
  id: string;
  type: GAMPEventType;
  chain: ChainId;
  payload: Record<string, unknown>;
  timestamp: Date;
}

export type GAMPEventCallback = (event: GAMPEvent) => void;
