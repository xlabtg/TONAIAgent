/**
 * TONAIAgent - AI Prime Brokerage Types
 *
 * Core type definitions for the AI Prime Brokerage infrastructure,
 * supporting autonomous AI funds and agents on The Open Network.
 * Includes multi-fund custody & clearing, margin & leverage engine,
 * risk aggregation, capital efficiency, institutional reporting,
 * securities lending, and cross-chain prime brokerage.
 */

// ============================================================================
// Enumerations
// ============================================================================

export type FundId = string;
export type AgentId = string;
export type AssetId = string;

export type ClearingStatus =
  | 'pending'
  | 'in_progress'
  | 'settled'
  | 'failed'
  | 'cancelled';

export type CollateralType =
  | 'ton'
  | 'usdt'
  | 'usdc'
  | 'btc'
  | 'eth'
  | 'rwa_token'
  | 'lp_token'
  | 'staking_token';

export type LeverageStrategy =
  | 'conservative'
  | 'moderate'
  | 'aggressive'
  | 'ultra_high';

export type RiskMetricType =
  | 'var'
  | 'cvar'
  | 'expected_shortfall'
  | 'max_drawdown'
  | 'volatility'
  | 'beta'
  | 'correlation'
  | 'sharpe'
  | 'sortino';

export type LiquiditySource =
  | 'internal_pool'
  | 'cross_fund'
  | 'external_dex'
  | 'otc'
  | 'lending_protocol';

export type ReportType =
  | 'nav_report'
  | 'risk_exposure'
  | 'audit_log'
  | 'regulatory_statement'
  | 'performance_attribution'
  | 'collateral_summary'
  | 'clearing_statement';

export type LendingStatus =
  | 'available'
  | 'on_loan'
  | 'recalled'
  | 'defaulted'
  | 'settled';

export type ChainId =
  | 'ton'
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'solana'
  | 'avalanche'
  | 'bsc';

export type PrimeBrokerageEventType =
  | 'fund_registered'
  | 'capital_allocated'
  | 'position_netted'
  | 'margin_call'
  | 'liquidation_triggered'
  | 'collateral_deposited'
  | 'collateral_released'
  | 'yield_stacked'
  | 'report_generated'
  | 'lending_initiated'
  | 'lending_recalled'
  | 'cross_chain_bridge'
  | 'stress_test_completed'
  | 'risk_alert'
  | 'clearing_settled';

// ============================================================================
// Multi-Fund Custody & Clearing Types
// ============================================================================

export interface CentralCapitalPool {
  id: string;
  name: string;
  totalCapital: number;
  availableCapital: number;
  allocatedCapital: number;
  currency: string;
  fundAllocations: FundAllocation[];
  lastUpdated: Date;
}

export interface FundAllocation {
  fundId: FundId;
  fundName: string;
  allocatedAmount: number;
  utilizationRate: number;
  agentIds: AgentId[];
  strategyTypes: string[];
  lastRebalanced: Date;
}

export interface AgentCapitalAllocation {
  agentId: AgentId;
  fundId: FundId;
  allocatedCapital: number;
  usedCapital: number;
  availableCapital: number;
  leverageMultiplier: number;
  effectiveCapital: number; // allocatedCapital * leverageMultiplier
  strategy: string;
  lastUpdated: Date;
}

export interface InternalClearingEntry {
  id: string;
  fromFundId: FundId;
  toFundId: FundId;
  assetId: AssetId;
  assetName: string;
  quantity: number;
  price: number;
  notionalValue: number;
  clearingType: 'net_settlement' | 'gross_settlement' | 'cross_netting';
  status: ClearingStatus;
  initiatedAt: Date;
  settledAt?: Date;
  metadata: Record<string, unknown>;
}

export interface NetExposurePosition {
  assetId: AssetId;
  assetName: string;
  longExposure: number;
  shortExposure: number;
  netExposure: number;
  netExposurePercent: number;
  grossExposure: number;
  byFund: FundExposureBreakdown[];
  capitalSaved: number; // Capital freed through netting
  updatedAt: Date;
}

export interface FundExposureBreakdown {
  fundId: FundId;
  fundName: string;
  longPosition: number;
  shortPosition: number;
  netPosition: number;
}

export interface CollateralPosition {
  id: string;
  ownerId: string; // Fund or agent ID
  assetId: AssetId;
  collateralType: CollateralType;
  amount: number;
  value: number; // USD value
  haircut: number; // Risk discount applied (0-1)
  adjustedValue: number; // value * (1 - haircut)
  isLocked: boolean;
  lockedFor?: string; // What this collateral secures
  depositedAt: Date;
  updatedAt: Date;
}

export interface AutomatedCollateralManagement {
  poolId: string;
  totalCollateral: number;
  adjustedCollateral: number;
  utilizationRate: number;
  marginCoverage: number; // adjustedCollateral / totalMarginRequired
  rebalanceThreshold: number;
  lastRebalance: Date;
  nextReview: Date;
}

export interface CustodyConfig {
  enableInternalNetting: boolean;
  settlementFrequency: 'realtime' | 'hourly' | 'daily';
  collateralHaircutRules: CollateralHaircutRule[];
  netExposureThreshold: number; // % above which netting is triggered
  autoRebalanceEnabled: boolean;
  autoRebalanceThreshold: number;
}

export interface CollateralHaircutRule {
  collateralType: CollateralType;
  haircut: number; // 0-1
  maxAllocation: number; // Max % of collateral pool
}

// ============================================================================
// Margin & Leverage Engine Types
// ============================================================================

export interface MarginAccount {
  id: string;
  ownerId: string; // Fund or agent ID
  ownerType: 'fund' | 'agent';
  totalEquity: number;
  usedMargin: number;
  availableMargin: number;
  marginLevel: number; // equity / usedMargin
  leverage: number;
  maintenanceMargin: number;
  initialMargin: number;
  marginCallLevel: number; // Margin level at which call is triggered
  liquidationLevel: number; // Margin level at which liquidation begins
  status: 'healthy' | 'warning' | 'margin_call' | 'liquidating';
  positions: MarginPosition[];
  updatedAt: Date;
}

export interface MarginPosition {
  positionId: string;
  assetId: AssetId;
  assetName: string;
  direction: 'long' | 'short';
  size: number;
  notionalValue: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  marginRequired: number;
  leverage: number;
  liquidationPrice: number;
}

export interface LeverageParameters {
  agentId: AgentId;
  baseMaxLeverage: number;
  currentMaxLeverage: number;
  currentLeverage: number;
  volatilityAdjustment: number; // Factor applied based on market volatility
  collateralQualityAdjustment: number; // Factor based on collateral quality
  strategyRiskAdjustment: number; // Factor based on strategy risk profile
  calculatedAt: Date;
  nextRecalculation: Date;
}

export interface DynamicMarginRequirement {
  assetId: AssetId;
  baseInitialMargin: number; // %
  baseMaintenanceMargin: number; // %
  volatilityAdjustedMargin: number; // %
  liquidityAdjustedMargin: number; // %
  finalMarginRequirement: number; // %
  computedAt: Date;
}

export interface LiquidationProtectionConfig {
  enabled: boolean;
  warningThresholdPercent: number; // Alert at this margin level
  autoDeleverage: boolean; // Automatically reduce position size
  autoCollateralTopup: boolean; // Automatically add collateral from pool
  hardLiquidationThresholdPercent: number;
  gracePeriodSeconds: number; // Time before forced liquidation
}

export interface LiquidationEvent {
  id: string;
  accountId: string;
  agentId: AgentId;
  fundId: FundId;
  triggerType: 'margin_call' | 'forced_liquidation' | 'emergency_stop';
  positionsLiquidated: LiquidatedPosition[];
  totalLoss: number;
  remainingEquity: number;
  timestamp: Date;
}

export interface LiquidatedPosition {
  positionId: string;
  assetId: AssetId;
  size: number;
  exitPrice: number;
  realizedLoss: number;
}

export interface BorrowingCostOptimization {
  agentId: AgentId;
  currentBorrowingRate: number;
  optimizedRate: number;
  savingsPercent: number;
  recommendedSource: string;
  alternativeSources: BorrowingSource[];
  computedAt: Date;
}

export interface BorrowingSource {
  name: string;
  rate: number;
  availableAmount: number;
  maxLeverage: number;
  collateralRequired: CollateralType[];
}

export interface MarginEngineConfig {
  defaultInitialMarginPercent: number;
  defaultMaintenanceMarginPercent: number;
  defaultLiquidationThresholdPercent: number;
  maxSystemLeverage: number;
  volatilityWindow: number; // Days for volatility calculation
  leverageStrategy: LeverageStrategy;
  liquidationProtection: Partial<LiquidationProtectionConfig>;
}

// ============================================================================
// Risk Aggregation Types
// ============================================================================

export interface PortfolioRiskSnapshot {
  id: string;
  timestamp: Date;
  totalAUM: number;
  portfolioVar95: number;
  portfolioVar99: number;
  portfolioCVaR95: number;
  portfolioCVaR99: number;
  maxDrawdown: number;
  currentDrawdown: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  beta: number;
  crossFundCorrelations: CrossFundCorrelation[];
  agentRiskContributions: AgentRiskContribution[];
  concentrationRisk: ConcentrationRisk;
}

export interface CrossFundCorrelation {
  fund1Id: FundId;
  fund2Id: FundId;
  correlation: number;
  period: '7d' | '30d' | '90d';
}

export interface AgentRiskContribution {
  agentId: AgentId;
  fundId: FundId;
  marginalVar: number;
  componentVar: number;
  riskContributionPercent: number;
}

export interface ConcentrationRisk {
  topAsset: { assetId: AssetId; name: string; weight: number };
  topStrategy: { strategyType: string; weight: number };
  topFund: { fundId: FundId; weight: number };
  herfindahlIndex: number; // Concentration measure (0-1)
}

export interface SystemicRiskModel {
  id: string;
  marketRegime: 'bull' | 'bear' | 'sideways' | 'crisis';
  systemicRiskScore: number; // 0-100
  contagionRisk: number; // 0-100, risk of cascade failures
  liquidityRisk: number; // 0-100
  correlationBreakdown: boolean; // True if normal correlations are breaking down
  estimatedAt: Date;
}

export interface StressTestScenario {
  id: string;
  name: string;
  description: string;
  shocks: AssetShock[];
  correlationOverride?: number; // Force correlation to this level
  liquidityMultiplier?: number; // Reduce liquidity by this factor
}

export interface AssetShock {
  assetId?: AssetId;
  assetClass?: string;
  shockPercent: number; // Negative for losses
}

export interface StressTestResult {
  scenarioId: string;
  scenarioName: string;
  portfolioLoss: number;
  portfolioLossPercent: number;
  agentImpacts: AgentStressImpact[];
  worstAffectedFund: { fundId: FundId; lossPercent: number };
  marginsBreached: number; // Number of margin accounts that would breach
  recommendedActions: string[];
  testedAt: Date;
}

export interface AgentStressImpact {
  agentId: AgentId;
  fundId: FundId;
  estimatedLoss: number;
  estimatedLossPercent: number;
  marginStatus: 'healthy' | 'warning' | 'margin_call' | 'liquidating';
}

export interface RiskAggregationConfig {
  varConfidenceLevel: number; // 0.95 or 0.99
  varTimeHorizon: number; // Days
  varMethod: 'historical' | 'parametric' | 'monte_carlo';
  lookbackPeriod: number; // Days
  stressTestFrequency: 'daily' | 'weekly';
  systemicRiskEnabled: boolean;
}

// ============================================================================
// Capital Efficiency Types
// ============================================================================

export interface IdleCapitalReport {
  timestamp: Date;
  totalIdleCapital: number;
  idleByFund: FundIdleCapital[];
  idlePercent: number;
  optimizationOpportunities: CapitalOpportunity[];
}

export interface FundIdleCapital {
  fundId: FundId;
  fundName: string;
  idleAmount: number;
  idlePercent: number;
  deployableAmount: number; // Amount that can safely be deployed
}

export interface CapitalOpportunity {
  id: string;
  type: 'yield_stacking' | 'cross_fund_lending' | 'strategy_deployment' | 'collateral_optimization';
  description: string;
  estimatedYield: number; // APY
  estimatedCapital: number; // Amount to deploy
  riskScore: number; // 0-100
  timeHorizon: 'immediate' | 'short_term' | 'medium_term';
  recommendedAction: string;
}

export interface YieldStack {
  id: string;
  fundId: FundId;
  assetId: AssetId;
  baseYield: number; // From underlying asset
  stakingYield: number; // Additional from staking
  lendingYield: number; // Additional from lending the token
  liquidityYield: number; // Additional from providing liquidity
  totalYield: number; // Sum of all yield layers
  capital: number;
  createdAt: Date;
}

export interface InternalLiquidityRoute {
  id: string;
  fromFundId: FundId;
  toFundId: FundId;
  fromAgentId?: AgentId;
  toAgentId?: AgentId;
  assetId: AssetId;
  amount: number;
  notionalValue: number;
  reason: string; // Why this route was chosen (e.g., "internal netting")
  savingsVsExternal: number; // Cost savings vs using external market
  executedAt: Date;
}

export interface CrossFundLiquidityPool {
  id: string;
  participatingFunds: FundId[];
  totalLiquidity: number;
  availableLiquidity: number;
  utilizationRate: number;
  contributions: FundLiquidityContribution[];
  internalRates: InternalRates;
  createdAt: Date;
  updatedAt: Date;
}

export interface FundLiquidityContribution {
  fundId: FundId;
  contributed: number;
  borrowed: number;
  netPosition: number; // Positive = net lender, negative = net borrower
}

export interface InternalRates {
  borrowingRate: number; // Annual rate
  lendingRate: number; // Annual rate
  spreadPercent: number; // Lending - Borrowing rate
}

export interface CapitalEfficiencyConfig {
  idleCapitalThreshold: number; // % below which capital is considered idle
  yieldStackingEnabled: boolean;
  crossFundLendingEnabled: boolean;
  internalRoutingEnabled: boolean;
  minYieldForDeployment: number; // Minimum APY to deploy idle capital
  maxRiskScoreForDeployment: number; // Maximum risk score for capital deployment
}

// ============================================================================
// Institutional Reporting Types
// ============================================================================

export interface NAVReport {
  id: string;
  reportDate: Date;
  generatedAt: Date;
  scope: 'system' | 'fund' | 'agent';
  scopeId?: string; // Fund or agent ID
  totalNAV: number;
  navPerShare?: number;
  assetBreakdown: NAVAssetBreakdown[];
  performanceSummary: ReportPerformanceSummary;
  currency: string;
}

export interface NAVAssetBreakdown {
  assetId: AssetId;
  assetName: string;
  assetClass: string;
  quantity: number;
  price: number;
  value: number;
  percentOfNAV: number;
  priceSource: string;
  priceTimestamp: Date;
}

export interface ReportPerformanceSummary {
  periodReturn: number;
  periodReturnPercent: number;
  annualizedReturn: number;
  benchmarkReturn?: number;
  alpha?: number;
  sharpeRatio: number;
  maxDrawdown: number;
  period: '1d' | '7d' | '30d' | '90d' | '1y' | 'inception';
}

export interface RiskExposureReport {
  id: string;
  reportDate: Date;
  generatedAt: Date;
  totalExposure: number;
  netExposure: number;
  grossExposure: number;
  leverageRatio: number;
  riskMetrics: Record<RiskMetricType, number>;
  assetExposures: AssetExposureDetail[];
  strategyExposures: StrategyExposureDetail[];
  currencyExposures: CurrencyExposure[];
  chainExposures: ChainExposureDetail[];
}

export interface AssetExposureDetail {
  assetId: AssetId;
  assetName: string;
  longExposure: number;
  shortExposure: number;
  netExposure: number;
  percentOfPortfolio: number;
}

export interface StrategyExposureDetail {
  strategyType: string;
  grossExposure: number;
  netExposure: number;
  percentOfPortfolio: number;
  agentCount: number;
}

export interface CurrencyExposure {
  currency: string;
  exposure: number;
  percentOfPortfolio: number;
  hedged: boolean;
}

export interface ChainExposureDetail {
  chainId: ChainId;
  exposure: number;
  percentOfPortfolio: number;
  protocols: string[];
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  eventType: string;
  actor: string; // Who/what performed the action
  actorType: 'human' | 'ai_agent' | 'system';
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  outcome: 'success' | 'failure' | 'pending';
  ipAddress?: string;
  signature?: string; // Cryptographic signature for tamper-proof logs
}

export interface RegulatoryStatement {
  id: string;
  statementType: 'monthly' | 'quarterly' | 'annual';
  jurisdiction: string;
  reportingPeriod: { from: Date; to: Date };
  generatedAt: Date;
  totalAUM: number;
  totalTransactionCount: number;
  totalTransactionVolume: number;
  largestPositions: NAVAssetBreakdown[];
  riskSummary: ReportPerformanceSummary;
  complianceNotes: string[];
  signedBy?: string;
}

export interface ReportingConfig {
  navCalculationFrequency: 'realtime' | 'hourly' | 'daily';
  auditLogRetentionDays: number;
  regulatoryReportingEnabled: boolean;
  defaultJurisdiction: string;
  priceSourcePriority: string[];
  includeAgentDecisionLogs: boolean;
}

// ============================================================================
// Securities Lending & Yield Types
// ============================================================================

export interface LendableToken {
  id: string;
  assetId: AssetId;
  assetName: string;
  ownerId: string;
  ownerType: 'fund' | 'agent';
  availableQuantity: number;
  lendedQuantity: number;
  currentLendingRate: number; // APY
  minimumLendingRate: number;
  maxLendingTerm: number; // Days
  collateralRequired: CollateralType[];
  status: LendingStatus;
  listedAt: Date;
}

export interface LendingAgreement {
  id: string;
  lenderId: string;
  borrowerId: string;
  assetId: AssetId;
  quantity: number;
  lendingRate: number; // APY agreed
  startDate: Date;
  endDate: Date;
  collateralPosted: CollateralPosition[];
  totalCollateralValue: number;
  collateralizationRatio: number; // totalCollateralValue / loan value
  status: LendingStatus;
  accruedInterest: number;
  lastInterestAccrual: Date;
}

export interface StructuredYieldProduct {
  id: string;
  name: string;
  strategy: 'fixed_income' | 'variable_yield' | 'hybrid' | 'principal_protected';
  minInvestment: number;
  targetYield: number; // APY
  actualYield?: number;
  maturityDays: number;
  backedBy: string[]; // What assets/strategies back this product
  riskRating: 'low' | 'medium' | 'high';
  totalCapacity: number;
  subscribedAmount: number;
  availableAmount: number;
  status: 'active' | 'closed' | 'matured';
  createdAt: Date;
  matureAt: Date;
}

export interface AgentToAgentLoan {
  id: string;
  lenderAgentId: AgentId;
  borrowerAgentId: AgentId;
  lenderFundId: FundId;
  borrowerFundId: FundId;
  assetId: AssetId;
  quantity: number;
  lendingRate: number;
  collateral: CollateralPosition;
  term: number; // Days
  startDate: Date;
  endDate: Date;
  status: LendingStatus;
  reason: string;
}

export interface SecuritiesLendingConfig {
  enabled: boolean;
  agentToAgentLendingEnabled: boolean;
  maxLendingDuration: number; // Days
  minCollateralizationRatio: number; // e.g., 1.5 = 150%
  autoRecallEnabled: boolean;
  autoRecallTrigger: 'margin_call' | 'strategy_need' | 'rate_threshold';
}

// ============================================================================
// Cross-Chain Prime Brokerage Types
// ============================================================================

export interface CrossChainCapitalPosition {
  id: string;
  fundId: FundId;
  chain: ChainId;
  totalCapital: number;
  availableCapital: number;
  currency: string;
  protocols: ChainProtocolPosition[];
  bridgeCosts: number; // Cost to move capital off this chain
  lastSyncedAt: Date;
}

export interface ChainProtocolPosition {
  protocolName: string;
  protocolType: 'dex' | 'lending' | 'staking' | 'vault';
  depositedAmount: number;
  currentValue: number;
  apy: number;
  liquidity: 'high' | 'medium' | 'low';
  withdrawalTime: number; // Hours
}

export interface CrossChainCollateral {
  id: string;
  assetId: AssetId;
  sourceChain: ChainId;
  targetChain: ChainId;
  amount: number;
  bridgedValue: number;
  bridgeFee: number;
  marginCredit: number; // How much margin this provides on target chain
  status: 'pending_bridge' | 'bridging' | 'active' | 'recalled';
  initiatedAt: Date;
  bridgedAt?: Date;
}

export interface BridgeAwareMarginLogic {
  assetId: AssetId;
  nativeChain: ChainId;
  targetChain: ChainId;
  bridgeTime: number; // Hours
  bridgeFeePercent: number;
  effectiveLTV: number; // Loan-to-value after bridge costs
  marginCreditFactor: number; // Discount applied to cross-chain collateral
}

export interface MultiChainCapitalRouter {
  id: string;
  sourceChain: ChainId;
  targetChain: ChainId;
  asset: AssetId;
  amount: number;
  estimatedBridgeFee: number;
  estimatedTime: number; // Minutes
  routeVia: string; // Bridge protocol
  reason: string; // Why capital is being routed
  status: 'routing' | 'bridging' | 'completed' | 'failed';
  initiatedAt: Date;
  completedAt?: Date;
}

export interface CrossChainBrokerageConfig {
  enabledChains: ChainId[];
  maxBridgeFeePercent: number;
  maxBridgeTimeMinutes: number;
  crossChainCollateralEnabled: boolean;
  crossChainMarginCreditFactor: number; // Discount for cross-chain collateral
  preferredBridges: Record<string, string>; // chain_pair -> bridge name
}

// ============================================================================
// Event Types
// ============================================================================

export interface PrimeBrokerageEvent {
  id: string;
  type: PrimeBrokerageEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export type PrimeBrokerageEventCallback = (event: PrimeBrokerageEvent) => void;

// ============================================================================
// Manager Config Types
// ============================================================================

export interface PrimeBrokerageConfig {
  custody?: Partial<CustodyConfig>;
  marginEngine?: Partial<MarginEngineConfig>;
  riskAggregation?: Partial<RiskAggregationConfig>;
  capitalEfficiency?: Partial<CapitalEfficiencyConfig>;
  reporting?: Partial<ReportingConfig>;
  securitiesLending?: Partial<SecuritiesLendingConfig>;
  crossChain?: Partial<CrossChainBrokerageConfig>;
}
