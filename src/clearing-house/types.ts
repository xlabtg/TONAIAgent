/**
 * TONAIAgent - AI-native Clearing House Types
 *
 * Core type definitions for the AI-native Clearing House infrastructure,
 * providing settlement guarantees, collateral management, systemic risk
 * prevention, multi-party netting, and institutional capital flows
 * for autonomous AI funds and agents on The Open Network.
 */

// ============================================================================
// Base Types & Enumerations
// ============================================================================

export type ClearingParticipantId = string;
export type TradeId = string;
export type ObligationId = string;
export type SettlementId = string;
export type InsuranceClaimId = string;
export type AuditEntryId = string;

export type ParticipantType =
  | 'ai_fund'
  | 'ai_agent'
  | 'prime_broker'
  | 'liquidity_provider'
  | 'institutional_client'
  | 'market_maker';

export type ClearingTradeStatus =
  | 'registered'
  | 'matched'
  | 'netting_eligible'
  | 'obligation_set'
  | 'settlement_pending'
  | 'settling'
  | 'settled'
  | 'failed'
  | 'defaulted'
  | 'cancelled';

export type ObligationStatus =
  | 'pending'
  | 'partially_settled'
  | 'settled'
  | 'novated'
  | 'defaulted'
  | 'cancelled';

export type SettlementStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'retry'
  | 'cancelled';

export type CollateralStatus =
  | 'posted'
  | 'held'
  | 'released'
  | 'seized'
  | 'liquidating'
  | 'liquidated';

export type DefaultStatus =
  | 'none'
  | 'pre_default'
  | 'defaulted'
  | 'in_resolution'
  | 'resolved'
  | 'loss_socialized';

export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

export type NettingStrategy = 'bilateral' | 'multilateral' | 'cross_currency' | 'cross_asset';

export type SettlementMechanism =
  | 'atomic_swap'
  | 'dvp'
  | 'free_of_payment'
  | 'cross_chain_bridge'
  | 'rwa_mapping';

export type InsuranceEventType =
  | 'default'
  | 'systemic_risk'
  | 'collateral_shortfall'
  | 'settlement_failure'
  | 'force_majeure';

export type ClearingHouseEventType =
  | 'trade_registered'
  | 'trade_matched'
  | 'obligation_created'
  | 'obligation_novated'
  | 'netting_executed'
  | 'collateral_posted'
  | 'collateral_released'
  | 'collateral_seized'
  | 'margin_call_issued'
  | 'margin_call_met'
  | 'settlement_initiated'
  | 'settlement_completed'
  | 'settlement_failed'
  | 'default_declared'
  | 'default_resolved'
  | 'insurance_claim_filed'
  | 'insurance_paid'
  | 'loss_socialized'
  | 'risk_alert'
  | 'stress_test_completed'
  | 'audit_entry_created';

export type AuditEventCategory =
  | 'trade'
  | 'settlement'
  | 'collateral'
  | 'default'
  | 'risk'
  | 'governance'
  | 'compliance'
  | 'system';

// ============================================================================
// Clearing Participant Types
// ============================================================================

export interface ClearingParticipant {
  id: ClearingParticipantId;
  name: string;
  type: ParticipantType;
  tier: RiskTier;
  registeredAt: Date;
  isActive: boolean;
  capitalBalance: number;
  marginAccount: ParticipantMarginAccount;
  collateralPledged: number;
  openObligations: number;
  defaultStatus: DefaultStatus;
  creditLimit: number;
  utilizationRate: number;
  riskScore: number; // 0-100
  metadata: Record<string, unknown>;
}

export interface ParticipantMarginAccount {
  participantId: ClearingParticipantId;
  initialMarginRequired: number;
  maintenanceMarginRequired: number;
  initialMarginPosted: number;
  variationMargin: number;
  excessMargin: number;
  marginCallAmount: number;
  hasMarginCall: boolean;
  marginCallDeadline?: Date;
  lastUpdated: Date;
}

// ============================================================================
// Trade Registration & Clearing Types
// ============================================================================

export interface RegisteredTrade {
  id: TradeId;
  buyerParticipantId: ClearingParticipantId;
  sellerParticipantId: ClearingParticipantId;
  assetId: string;
  assetName: string;
  assetClass: string;
  quantity: number;
  price: number;
  notionalValue: number;
  currency: string;
  tradeDate: Date;
  settlementDate: Date;
  status: ClearingTradeStatus;
  settlementMechanism: SettlementMechanism;
  chainId?: string;
  obligationId?: ObligationId;
  metadata: Record<string, unknown>;
  registeredAt: Date;
  updatedAt: Date;
}

export interface TradeObligationPair {
  tradeId: TradeId;
  buyerObligation: number;
  sellerObligation: number;
  assetId: string;
  notionalValue: number;
}

// ============================================================================
// Netting Engine Types
// ============================================================================

export interface NetObligation {
  id: ObligationId;
  participantId: ClearingParticipantId;
  netPayable: number; // Positive = must pay, negative = will receive
  netReceivable: number;
  grossPayable: number;
  grossReceivable: number;
  nettingRatio: number; // netPayable / grossPayable (compression ratio)
  assetObligations: AssetObligation[];
  status: ObligationStatus;
  novatedFrom: TradeId[];
  settlementDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetObligation {
  assetId: string;
  assetName: string;
  netQuantity: number; // Positive = must deliver, negative = will receive
  grossQuantity: number;
  estimatedValue: number;
  currency: string;
}

export interface NettingRun {
  id: string;
  strategy: NettingStrategy;
  participantCount: number;
  tradesNetted: number;
  grossExposureBefore: number;
  netExposureAfter: number;
  capitalFreed: number;
  compressionRatio: number; // net / gross
  efficiencyGain: number; // % reduction
  obligationsCreated: ObligationId[];
  executedAt: Date;
}

export interface ExposureMatrix {
  assetId: string;
  longParticipants: ExposureEntry[];
  shortParticipants: ExposureEntry[];
  grossLongExposure: number;
  grossShortExposure: number;
  netExposure: number;
  concentrationRisk: number; // 0-1, Herfindahl index
}

export interface ExposureEntry {
  participantId: ClearingParticipantId;
  participantName: string;
  exposure: number;
  percentOfTotal: number;
}

export interface NettingEngineConfig {
  strategy: NettingStrategy;
  minNettingThreshold: number; // Minimum position size to include in netting
  maxConcentrationRisk: number; // 0-1, halt netting if exceeded
  enableCrossAssetNetting: boolean;
  enableCrossCurrencyNetting: boolean;
  novationEnabled: boolean; // Replace bilateral with CCP obligations
}

// ============================================================================
// Collateral Management Types
// ============================================================================

export interface CollateralRequirement {
  participantId: ClearingParticipantId;
  initialMarginRequired: number;
  maintenanceMarginRequired: number;
  variationMarginRequired: number;
  totalRequired: number;
  totalPosted: number;
  shortfall: number;
  surplus: number;
  coverageRatio: number; // totalPosted / totalRequired
  computedAt: Date;
}

export interface ClearingCollateralPosition {
  id: string;
  participantId: ClearingParticipantId;
  assetId: string;
  assetName: string;
  collateralType: string;
  quantity: number;
  marketValue: number;
  haircut: number;
  adjustedValue: number;
  status: CollateralStatus;
  heldFor: 'initial_margin' | 'variation_margin' | 'default_fund';
  postedAt: Date;
  updatedAt: Date;
}

export interface DynamicMarginModel {
  assetId: string;
  baseMarginPercent: number;
  volatilityMultiplier: number; // Applied based on realized volatility
  liquidityPenalty: number; // Applied if asset is illiquid
  concentrationPenalty: number; // Applied for large concentrated positions
  computedMarginPercent: number;
  modelInputs: {
    recentVolatility: number;
    averageDailyVolume: number;
    positionConcentration: number;
  };
  computedAt: Date;
}

export interface CollateralManagementConfig {
  initialMarginPercent: number;
  maintenanceMarginPercent: number;
  variationMarginFrequency: 'realtime' | 'hourly' | 'daily';
  collateralTypes: CollateralTypeConfig[];
  autoLiquidationEnabled: boolean;
  autoLiquidationThreshold: number; // Margin coverage below which liquidation triggers
  defaultFundContributionPercent: number; // % of initial margin contributed to default fund
}

export interface CollateralTypeConfig {
  assetId: string;
  assetName: string;
  haircut: number; // 0-1
  maxAllocationPercent: number;
  minRating?: string;
  acceptedForInitialMargin: boolean;
  acceptedForVariationMargin: boolean;
}

// ============================================================================
// Default Resolution Types
// ============================================================================

export interface DefaultFund {
  id: string;
  totalCapital: number;
  availableCapital: number;
  participantContributions: DefaultFundContribution[];
  utilizationRate: number;
  lastReplenishedAt: Date;
  updatedAt: Date;
}

export interface DefaultFundContribution {
  participantId: ClearingParticipantId;
  amount: number;
  contributedAt: Date;
  lastUpdated: Date;
}

export interface DefaultEvent {
  id: string;
  participantId: ClearingParticipantId;
  participantName: string;
  defaultType: 'margin_call_failure' | 'delivery_failure' | 'payment_failure' | 'insolvency';
  totalDeficit: number;
  affectedTrades: TradeId[];
  affectedObligations: ObligationId[];
  resolutionSteps: DefaultResolutionStep[];
  status: DefaultStatus;
  insuranceActivated: boolean;
  insuranceClaimed: number;
  defaultFundActivated: boolean;
  defaultFundUsed: number;
  socializedLoss: number;
  declaredAt: Date;
  resolvedAt?: Date;
}

export interface DefaultResolutionStep {
  step: number;
  action:
    | 'seize_collateral'
    | 'liquidate_positions'
    | 'activate_insurance'
    | 'draw_default_fund'
    | 'socialize_loss';
  amountRecovered: number;
  remainingDeficit: number;
  executedAt: Date;
  status: 'pending' | 'executed' | 'failed';
}

export interface InsurancePool {
  id: string;
  totalCapital: number;
  availableCapital: number;
  utilizationRate: number;
  claimsHistory: InsuranceClaim[];
  premiumRate: number; // Annual premium as % of notional
  maxSingleClaimPercent: number; // Max % of pool for single claim
  fundingMechanism: 'participant_premium' | 'protocol_revenue' | 'external_insurance' | 'hybrid';
  updatedAt: Date;
}

export interface InsuranceClaim {
  id: InsuranceClaimId;
  eventType: InsuranceEventType;
  claimantId: ClearingParticipantId;
  requestedAmount: number;
  approvedAmount: number;
  paidAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'partial';
  relatedDefaultId?: string;
  filedAt: Date;
  resolvedAt?: Date;
}

export interface DefaultResolutionConfig {
  autoLiquidationEnabled: boolean;
  liquidationGracePeriodSeconds: number;
  insurancePoolEnabled: boolean;
  defaultFundEnabled: boolean;
  socializedLossEnabled: boolean;
  maxSocializedLossPercent: number; // Max % to spread across participants
}

// ============================================================================
// Settlement Layer Types
// ============================================================================

export interface SettlementInstruction {
  id: SettlementId;
  obligationId: ObligationId;
  payerParticipantId: ClearingParticipantId;
  receiverParticipantId: ClearingParticipantId;
  assetId: string;
  amount: number;
  currency: string;
  mechanism: SettlementMechanism;
  chainId?: string;
  scheduledAt: Date;
  status: SettlementStatus;
  attempts: SettlementAttempt[];
  txHash?: string;
  completedAt?: Date;
  createdAt: Date;
}

export interface SettlementAttempt {
  attemptNumber: number;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  txHash?: string;
  attemptedAt: Date;
}

export interface AtomicSettlement {
  id: string;
  legs: SettlementLeg[];
  allOrNothing: boolean;
  status: SettlementStatus;
  initiatedAt: Date;
  completedAt?: Date;
}

export interface SettlementLeg {
  legId: string;
  instruction: SettlementInstruction;
  dependsOn?: string[]; // Other leg IDs that must complete first
  status: SettlementStatus;
}

export interface CrossChainSettlement {
  id: string;
  sourceChain: string;
  targetChain: string;
  bridgeProtocol: string;
  amount: number;
  assetId: string;
  estimatedBridgeTime: number; // Minutes
  bridgeFee: number;
  status: SettlementStatus;
  sourceSettlement?: SettlementInstruction;
  targetSettlement?: SettlementInstruction;
  initiatedAt: Date;
  completedAt?: Date;
}

export interface RWASettlement {
  id: string;
  rwaAssetId: string;
  rwaAssetType: 'bond' | 'equity' | 'real_estate' | 'commodity' | 'fund_share';
  onChainTokenId: string;
  offChainCustodian: string;
  settledOnChain: boolean;
  settledOffChain: boolean;
  legalSettlementDate: Date;
  blockchainSettlementDate?: Date;
  status: SettlementStatus;
}

export interface SettlementLayerConfig {
  defaultMechanism: SettlementMechanism;
  settlementWindowSeconds: number; // Time to complete settlement
  maxRetries: number;
  retryDelaySeconds: number;
  atomicSettlementEnabled: boolean;
  crossChainEnabled: boolean;
  rwaSettlementEnabled: boolean;
}

// ============================================================================
// Audit & Transparency Types
// ============================================================================

export interface ClearingAuditEntry {
  id: AuditEntryId;
  timestamp: Date;
  category: AuditEventCategory;
  eventType: ClearingHouseEventType;
  actor: string;
  actorType: 'ai_agent' | 'system' | 'operator' | 'smart_contract';
  action: string;
  resourceType: string;
  resourceId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  details: Record<string, unknown>;
  outcome: 'success' | 'failure' | 'pending';
  signature?: string; // Cryptographic hash for tamper-proof logs
  blockNumber?: number; // On-chain block reference
  txHash?: string;
}

export interface ExposureDashboard {
  generatedAt: Date;
  totalParticipants: number;
  activeParticipants: number;
  totalTradesRegistered: number;
  openTradesCount: number;
  totalNotionalValue: number;
  netExposure: number;
  grossExposure: number;
  compressionRatio: number;
  pendingSettlements: number;
  settlementValue: number;
  collateralPosted: number;
  marginUtilization: number;
  defaultFundSize: number;
  insurancePoolSize: number;
  participantRiskSummary: ParticipantRiskSummary[];
}

export interface ParticipantRiskSummary {
  participantId: ClearingParticipantId;
  participantName: string;
  type: ParticipantType;
  openPositions: number;
  notionalExposure: number;
  marginCoverage: number;
  riskScore: number;
  defaultStatus: DefaultStatus;
}

export interface ClearingReport {
  id: string;
  reportType:
    | 'daily_summary'
    | 'settlement_report'
    | 'exposure_report'
    | 'default_report'
    | 'regulatory_report'
    | 'audit_report';
  period: { from: Date; to: Date };
  generatedAt: Date;
  summary: ClearingReportSummary;
  details: Record<string, unknown>;
}

export interface ClearingReportSummary {
  totalTrades: number;
  settledTrades: number;
  failedTrades: number;
  totalNotional: number;
  netExposure: number;
  collateralMobilized: number;
  defaultEvents: number;
  insurancePaid: number;
  systemicRiskScore: number;
}

export interface SystemicRiskSnapshot {
  timestamp: Date;
  overallRiskScore: number; // 0-100
  marketRegime: 'normal' | 'stressed' | 'crisis';
  concentrationRisk: number; // 0-1
  settlementRisk: number; // 0-1, % of value at risk in settlement
  liquidityRisk: number; // 0-1
  counterpartyRisk: number; // 0-1
  contagionRisk: number; // 0-1, risk of cascade defaults
  topRisks: string[];
  recommendedActions: string[];
}

export interface AuditConfig {
  immutableLogging: boolean;
  signatureEnabled: boolean;
  onChainAnchoringEnabled: boolean;
  retentionDays: number;
  complianceFrameworks: string[];
  reportingFrequency: 'realtime' | 'hourly' | 'daily';
}

// ============================================================================
// Unified Clearing House Config
// ============================================================================

export interface ClearingHouseConfig {
  netting?: Partial<NettingEngineConfig>;
  collateral?: Partial<CollateralManagementConfig>;
  defaultResolution?: Partial<DefaultResolutionConfig>;
  settlement?: Partial<SettlementLayerConfig>;
  audit?: Partial<AuditConfig>;
}

// ============================================================================
// Event Types
// ============================================================================

export interface ClearingHouseEvent {
  id: string;
  type: ClearingHouseEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export type ClearingHouseEventCallback = (event: ClearingHouseEvent) => void;
