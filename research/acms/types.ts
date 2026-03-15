/**
 * Autonomous Capital Markets Stack (ACMS) — Types
 *
 * Comprehensive type definitions for the vertically integrated, AI-native
 * capital markets infrastructure on The Open Network (TON).
 *
 * Stack Architecture — 9 Layers:
 * Layer 1: Asset Layer         — Crypto assets, RWA tokenization, tokenized funds, structured products
 * Layer 2: Agent & Fund Layer  — AI hedge funds, strategy agents, treasury agents, DAO funds
 * Layer 3: Liquidity Layer     — Institutional Liquidity Network, smart order routing, cross-chain
 * Layer 4: Prime Brokerage     — Margin, leverage, capital efficiency, internal netting
 * Layer 5: Clearing & Settlement — Netting engine, collateral management, default resolution
 * Layer 6: Risk & Stability    — Leverage governor, circuit breakers, insurance fund, Stability Index
 * Layer 7: Monetary & Treasury — Emission control, treasury allocation, incentive management
 * Layer 8: Inter-Protocol      — IPLS, cross-chain routing, liquidity passport
 * Layer 9: Governance          — DAO governance, parameter tuning, emergency overrides
 */

// ============================================================================
// Core Identifiers
// ============================================================================

export type AssetId = string;
export type AgentId = string;
export type FundId = string;
export type ProtocolId = string;
export type LayerId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type ChainId = string;
export type ProposalId = string;
export type ParticipantId = string;

// ============================================================================
// ACMS Configuration
// ============================================================================

export interface ACMSConfig {
  networkId: string;
  environment: 'mainnet' | 'testnet' | 'sandbox';
  governanceThreshold?: number;         // Minimum quorum for governance actions (0-1)
  stabilityIndexTarget?: number;        // Target Stability Index score (0-100)
  maxSystemLeverage?: number;           // Maximum system-wide leverage ratio
  emergencyShutdownEnabled?: boolean;   // Enable emergency shutdown mechanism
  crossProtocolEnabled?: boolean;       // Enable cross-protocol integration
  monetaryPolicyAuto?: boolean;         // Enable autonomous monetary policy
}

export const DEFAULT_ACMS_CONFIG: ACMSConfig = {
  networkId: 'ton-mainnet',
  environment: 'sandbox',
  governanceThreshold: 0.51,
  stabilityIndexTarget: 80,
  maxSystemLeverage: 10,
  emergencyShutdownEnabled: true,
  crossProtocolEnabled: true,
  monetaryPolicyAuto: false,
};

// ============================================================================
// Layer 1: Asset Layer Types
// ============================================================================

export type AssetType =
  | 'crypto'
  | 'rwa_token'
  | 'tokenized_fund'
  | 'structured_product'
  | 'stablecoin'
  | 'governance_token'
  | 'yield_token';

export type AssetStatus = 'active' | 'suspended' | 'delisted' | 'pending';

export interface Asset {
  id: AssetId;
  symbol: string;
  name: string;
  type: AssetType;
  chainId: ChainId;
  contractAddress?: string;
  decimals: number;
  totalSupply: number;
  circulatingSupply: number;
  priceUsd: number;
  marketCapUsd: number;
  status: AssetStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenizedFund extends Asset {
  type: 'tokenized_fund';
  fundManagerId: AgentId;
  navPerShare: number;
  totalAssets: number;
  aum: number;
  managementFeeRate: number;
  performanceFeeRate: number;
  redemptionNotice: number;  // Days
  strategyDescription: string;
}

export interface StructuredProduct extends Asset {
  type: 'structured_product';
  underlyingAssets: AssetId[];
  maturityDate: Date;
  principalProtected: boolean;
  targetYield: number;
  riskRating: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC';
  issuerAgentId: AgentId;
}

export interface AssetIssuanceRequest {
  proposerId: AgentId;
  assetType: AssetType;
  symbol: string;
  name: string;
  chainId: ChainId;
  initialSupply: number;
  metadata: Record<string, unknown>;
}

export interface AssetLayerStatus {
  totalAssets: number;
  activeAssets: number;
  totalMarketCapUsd: number;
  tokenizedFunds: number;
  structuredProducts: number;
  rwasTokenized: number;
}

// ============================================================================
// Layer 2: Agent & Fund Layer Types
// ============================================================================

export type AgentType =
  | 'hedge_fund'
  | 'strategy_agent'
  | 'treasury_agent'
  | 'dao_fund'
  | 'arbitrage_agent'
  | 'market_maker'
  | 'risk_agent';

export type AgentStatus = 'active' | 'paused' | 'suspended' | 'terminated';

export interface Agent {
  id: AgentId;
  name: string;
  type: AgentType;
  fundId?: FundId;
  aum: number;
  allocationUsd: number;
  currentLeverage: number;
  maxLeverage: number;
  riskScore: number;      // 0-100
  performanceScore: number; // 0-100
  status: AgentStatus;
  strategies: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AIManagedFund {
  id: FundId;
  name: string;
  fundType: 'hedge_fund' | 'dao_fund' | 'index_fund' | 'yield_fund';
  managerAgentId: AgentId;
  agentIds: AgentId[];
  totalAum: number;
  navPerShare: number;
  totalShares: number;
  targetReturn: number;        // Annualized %
  actualReturn: number;        // Annualized %
  drawdown: number;            // Current drawdown %
  maxDrawdown: number;         // Historical max drawdown %
  sharpeRatio: number;
  status: 'open' | 'closed' | 'liquidating';
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentFundLayerStatus {
  totalAgents: number;
  activeAgents: number;
  totalFunds: number;
  activeFunds: number;
  totalAumUsd: number;
  averageLeverage: number;
  agentsByType: Record<AgentType, number>;
}

// ============================================================================
// Layer 3: Liquidity Layer Types
// ============================================================================

export type LiquiditySourceType =
  | 'dex_onchain'
  | 'otc_desk'
  | 'internal_pool'
  | 'cross_chain_bridge'
  | 'lending_protocol'
  | 'vault';

export type OrderType = 'market' | 'limit' | 'twap' | 'vwap' | 'ioc' | 'fok';
export type OrderSide = 'buy' | 'sell';

export interface LiquiditySource {
  id: string;
  type: LiquiditySourceType;
  name: string;
  chainId: ChainId;
  tvlUsd: number;
  dailyVolumeUsd: number;
  feeBps: number;
  latencyMs: number;
  isActive: boolean;
}

export interface LiquidityPool {
  id: string;
  name: string;
  assetIds: AssetId[];
  tvlUsd: number;
  utilizationRate: number;   // 0-1
  apy: number;
  participantCount: number;
  createdAt: Date;
}

export interface SmartOrderRoute {
  id: string;
  orderId: string;
  assetIn: AssetId;
  assetOut: AssetId;
  amountIn: number;
  expectedAmountOut: number;
  expectedSlippageBps: number;
  routeSegments: RouteSegment[];
  totalFeeBps: number;
  estimatedGasUsd: number;
  estimatedExecutionMs: number;
  createdAt: Date;
}

export interface RouteSegment {
  sourceId: string;
  sourceType: LiquiditySourceType;
  assetIn: AssetId;
  assetOut: AssetId;
  amountIn: number;
  expectedAmountOut: number;
  weight: number;  // Proportion of order routed here
}

export interface LiquidityLayerStatus {
  totalSources: number;
  activeSources: number;
  totalTvlUsd: number;
  dailyVolumeUsd: number;
  averageSlippageBps: number;
  liquidityPools: number;
  totalPoolTvlUsd: number;
}

// ============================================================================
// Layer 4: Prime Brokerage Layer Types (references prime-brokerage module)
// ============================================================================

export interface PrimeBrokerageCapitalPool {
  id: string;
  name: string;
  totalCapital: number;
  allocatedCapital: number;
  availableCapital: number;
  fundAllocations: FundAllocation[];
  utilizationRate: number;
}

export interface FundAllocation {
  fundId: FundId;
  fundName: string;
  allocation: number;
  leverage: number;
}

export interface MarginAccount {
  id: string;
  ownerId: AgentId;
  ownerType: 'agent' | 'fund';
  totalEquity: number;
  usedMargin: number;
  availableMargin: number;
  leverage: number;
  marginCallLevel: number;
  liquidationLevel: number;
  status: 'healthy' | 'warning' | 'margin_call' | 'liquidating';
}

export interface PrimeBrokerageLayerStatus {
  capitalPools: number;
  totalPooledCapitalUsd: number;
  marginAccounts: number;
  accountsAtRisk: number;
  averageLeverage: number;
  totalMarginUtilization: number;
}

// ============================================================================
// Layer 5: Clearing & Settlement Layer Types
// ============================================================================

export type ClearingStatus = 'pending' | 'netting' | 'settling' | 'settled' | 'failed';
export type SettlementMethod = 'dvp' | 'rvp' | 'fop' | 'free_of_payment' | 'internal_netting';

export interface ClearingEntry {
  id: string;
  tradeId: string;
  buyerId: ParticipantId;
  sellerId: ParticipantId;
  assetId: AssetId;
  quantity: number;
  priceUsd: number;
  grossValueUsd: number;
  netValueUsd: number;
  settlementMethod: SettlementMethod;
  status: ClearingStatus;
  scheduledSettlementDate: Date;
  actualSettlementDate?: Date;
  createdAt: Date;
}

export interface NettingResult {
  participantId: ParticipantId;
  grossBuyValueUsd: number;
  grossSellValueUsd: number;
  netPositionUsd: number;
  nettingEfficiencyPercent: number;
  settledEntries: string[];
}

export interface CollateralPool {
  id: string;
  ownerId: ParticipantId;
  totalValueUsd: number;
  availableValueUsd: number;
  lockedValueUsd: number;
  haircut: number;           // Applied haircut %
  adjustedValueUsd: number;
}

export interface DefaultResolutionPlan {
  id: string;
  defaultedParticipantId: ParticipantId;
  exposureUsd: number;
  insuranceFundUsage: number;
  collateralLiquidation: number;
  remainingLoss: number;
  resolution: 'fully_covered' | 'partially_covered' | 'not_covered';
  steps: DefaultResolutionStep[];
  createdAt: Date;
}

export interface DefaultResolutionStep {
  step: number;
  description: string;
  amountUsd: number;
  source: 'insurance_fund' | 'collateral' | 'defaulter_assets' | 'protocol_treasury';
}

export interface ClearingLayerStatus {
  pendingEntries: number;
  settledTodayCount: number;
  settledTodayValueUsd: number;
  nettingEfficiencyPercent: number;
  collateralPoolsCount: number;
  totalCollateralUsd: number;
  insuranceFundUsd: number;
}

// ============================================================================
// Layer 6: Risk & Stability Layer Types
// ============================================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type CircuitBreakerState = 'normal' | 'triggered' | 'halted';

export interface SystemStabilityIndex {
  score: number;            // 0-100, higher is more stable
  components: {
    liquidityScore: number;
    leverageScore: number;
    collateralizationScore: number;
    concentrationScore: number;
    volatilityScore: number;
  };
  trend: 'improving' | 'stable' | 'deteriorating';
  riskLevel: RiskLevel;
  computedAt: Date;
}

export interface LeverageGovernor {
  systemMaxLeverage: number;
  currentSystemLeverage: number;
  agentLeverageLimits: Map<AgentId, number>;
  autoDeleverageThreshold: number;
  autoDeleverageActive: boolean;
}

export interface CircuitBreaker {
  id: string;
  name: string;
  triggerCondition: string;
  triggerThreshold: number;
  currentValue: number;
  state: CircuitBreakerState;
  triggeredAt?: Date;
  resetAt?: Date;
  affectedSystems: string[];
}

export interface InsuranceFund {
  id: string;
  totalValueUsd: number;
  reserveRatio: number;     // % of system TVL
  coverage: {
    maxSingleDefault: number;
    maxTotalLoss: number;
    fundedByProtocol: number;
    fundedByPremiums: number;
  };
  triggerConditions: string[];
}

export interface RiskStabilityLayerStatus {
  stabilityIndex: number;
  riskLevel: RiskLevel;
  circuitBreakersActive: number;
  circuitBreakersTotal: number;
  systemLeverage: number;
  insuranceFundUsd: number;
  autoDeleverageActive: boolean;
}

// ============================================================================
// Layer 7: Monetary & Treasury Layer Types
// ============================================================================

export type MonetaryPolicyAction =
  | 'emission_increase'
  | 'emission_decrease'
  | 'emission_halt'
  | 'buyback'
  | 'burn'
  | 'liquidity_injection'
  | 'liquidity_withdrawal';

export interface MonetaryPolicy {
  id: string;
  name: string;
  targetInflationRate: number;
  currentEmissionRate: number;
  reserveRatio: number;
  collateralizationRatio: number;
  stabilizationBuffer: number;
  activeActions: MonetaryPolicyAction[];
  lastReviewAt: Date;
}

export interface EmissionSchedule {
  id: string;
  assetId: AssetId;
  epochDurationDays: number;
  currentEpoch: number;
  epochEmission: number;
  totalScheduledEmission: number;
  emittedToDate: number;
  nextEmissionAt: Date;
  decayRate: number;   // % reduction per epoch
}

export interface TreasuryAllocation {
  id: string;
  purpose: 'operations' | 'grants' | 'insurance' | 'liquidity' | 'buyback' | 'reserves';
  allocatedAmountUsd: number;
  spentAmountUsd: number;
  remainingAmountUsd: number;
  approvedBy: ProposalId;
  expiresAt?: Date;
}

export interface MonetaryTreasuryLayerStatus {
  treasuryValueUsd: number;
  currentEmissionRate: number;
  reserveRatio: number;
  collateralizationRatio: number;
  allocationCount: number;
  activePolicies: number;
}

// ============================================================================
// Layer 8: Inter-Protocol Layer Types
// ============================================================================

export type ProtocolType =
  | 'defi_lending'
  | 'dex'
  | 'derivatives'
  | 'bridge'
  | 'oracle'
  | 'insurance'
  | 'real_world_asset'
  | 'ai_fund';

export interface ExternalProtocol {
  id: ProtocolId;
  name: string;
  type: ProtocolType;
  chainId: ChainId;
  tvlUsd: number;
  integrationType: 'read_only' | 'bidirectional' | 'liquidity_sharing';
  adapterVersion: string;
  isActive: boolean;
  lastSyncAt: Date;
}

export interface LiquidityPassport {
  id: string;
  fundId: FundId;
  issuedTo: AgentId;
  eligibleProtocols: ProtocolId[];
  crossChainPositions: CrossChainPosition[];
  maxAllocationUsd: number;
  currentAllocationUsd: number;
  expiresAt: Date;
  createdAt: Date;
}

export interface CrossChainPosition {
  id: string;
  holderId: AgentId;
  chainId: ChainId;
  assetId: AssetId;
  amount: number;
  valueUsd: number;
  bridgedFrom?: ChainId;
  lastSyncAt: Date;
}

export interface CrossProtocolAllocation {
  id: string;
  fromProtocolId: ProtocolId;
  toProtocolId: ProtocolId;
  assetId: AssetId;
  amount: number;
  purpose: string;
  status: 'pending' | 'in_transit' | 'completed' | 'failed';
  initiatedAt: Date;
  completedAt?: Date;
}

export interface InterProtocolLayerStatus {
  connectedProtocols: number;
  activeProtocols: number;
  totalCrossProtocolTvlUsd: number;
  activePassports: number;
  crossChainPositions: number;
  pendingAllocations: number;
}

// ============================================================================
// Layer 9: Governance Layer Types
// ============================================================================

export type ProposalType =
  | 'parameter_change'
  | 'protocol_upgrade'
  | 'emergency_action'
  | 'treasury_allocation'
  | 'agent_suspension'
  | 'circuit_breaker_reset'
  | 'new_asset_listing';

export type ProposalStatus =
  | 'draft'
  | 'active'
  | 'passed'
  | 'rejected'
  | 'executed'
  | 'cancelled'
  | 'expired';

export interface GovernanceProposal {
  id: ProposalId;
  type: ProposalType;
  title: string;
  description: string;
  proposerId: ParticipantId;
  targetLayer: LayerId;
  targetParameter?: string;
  proposedValue?: unknown;
  currentValue?: unknown;
  votesFor: number;
  votesAgainst: number;
  quorumRequired: number;
  status: ProposalStatus;
  discussionUrl?: string;
  createdAt: Date;
  votingEndsAt: Date;
  executedAt?: Date;
}

export interface GovernanceVote {
  id: string;
  proposalId: ProposalId;
  voterId: ParticipantId;
  vote: 'for' | 'against' | 'abstain';
  votingPower: number;
  reason?: string;
  votedAt: Date;
}

export interface ParameterRegistry {
  layer: LayerId;
  parameter: string;
  currentValue: unknown;
  minValue?: number;
  maxValue?: number;
  lastChangedAt: Date;
  lastChangedByProposal: ProposalId;
  description: string;
}

export interface EmergencyOverride {
  id: string;
  type: 'system_halt' | 'agent_suspend' | 'circuit_break' | 'collateral_freeze' | 'emission_halt';
  triggeredBy: ParticipantId;
  reason: string;
  affectedLayer: LayerId;
  affectedEntityId?: string;
  activatedAt: Date;
  expectedDuration?: number;  // Minutes
  resolvedAt?: Date;
  isActive: boolean;
}

export interface GovernanceLayerStatus {
  activeProposals: number;
  passedProposals: number;
  totalVoters: number;
  averageParticipationRate: number;
  parametersManaged: number;
  activeEmergencyOverrides: number;
}

// ============================================================================
// ACMS System-Level Types
// ============================================================================

export interface ACMSStackStatus {
  layer1AssetLayer: AssetLayerStatus;
  layer2AgentFundLayer: AgentFundLayerStatus;
  layer3LiquidityLayer: LiquidityLayerStatus;
  layer4PrimeBrokerage: PrimeBrokerageLayerStatus;
  layer5ClearingSettlement: ClearingLayerStatus;
  layer6RiskStability: RiskStabilityLayerStatus;
  layer7MonetaryTreasury: MonetaryTreasuryLayerStatus;
  layer8InterProtocol: InterProtocolLayerStatus;
  layer9Governance: GovernanceLayerStatus;
  systemStabilityIndex: number;
  totalAumUsd: number;
  totalTvlUsd: number;
  generatedAt: Date;
}

export interface ACMSDemoScenario {
  name: string;
  description: string;
  steps: ACMSDemoStep[];
}

export interface ACMSDemoStep {
  step: number;
  layer: LayerId;
  action: string;
  description: string;
  expectedOutcome: string;
}

export type ACMSEventType =
  | 'asset_issued'
  | 'agent_deployed'
  | 'fund_created'
  | 'liquidity_routed'
  | 'trade_cleared'
  | 'position_settled'
  | 'risk_alert'
  | 'circuit_breaker_triggered'
  | 'monetary_policy_updated'
  | 'cross_protocol_allocation'
  | 'governance_proposal_passed'
  | 'emergency_override_activated'
  | 'stability_index_updated';

export interface ACMSEvent {
  type: ACMSEventType;
  layer: LayerId;
  timestamp: Date;
  data: Record<string, unknown>;
}

export type ACMSEventCallback = (event: ACMSEvent) => void;
