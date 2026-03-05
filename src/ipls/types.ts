/**
 * TONAIAgent - Inter-Protocol Liquidity Standard (IPLS) Type Definitions
 *
 * Core type definitions for the Inter-Protocol Liquidity Standard (IPLS),
 * a standardized framework for cross-protocol liquidity routing, risk-aware
 * capital allocation, shared clearing logic, and institutional interoperability.
 *
 * Follows the Institutional Liquidity Network (#119), AI Clearing House (#120),
 * GAAMP (#121), Systemic Risk (#122), and AI Monetary Policy (#123) modules.
 */

// ============================================================================
// Core IPLS Identifiers
// ============================================================================

export type ProtocolId = string;
export type PassportId = string;
export type AdapterId = string;
export type LiquidityRequestId = string;
export type RiskAssessmentId = string;
export type ClearingSessionId = string;

// ============================================================================
// Enumerations
// ============================================================================

export type ProtocolType =
  | 'dex'
  | 'lending'
  | 'derivatives'
  | 'yield_aggregator'
  | 'bridge'
  | 'clearing_house'
  | 'prime_broker'
  | 'stablecoin'
  | 'rwa'
  | 'treasury';

export type LiquidityProviderStatus =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'pending_approval'
  | 'maintenance';

export type LiquidityConsumerStatus =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'pending_kyc';

export type ExposureType =
  | 'credit'
  | 'market'
  | 'liquidity'
  | 'operational'
  | 'smart_contract'
  | 'bridge'
  | 'counterparty';

export type RiskTier =
  | 'tier1'
  | 'tier2'
  | 'tier3'
  | 'unrated';

export type ComplianceStatus =
  | 'compliant'
  | 'restricted'
  | 'non_compliant'
  | 'under_review'
  | 'exempt';

export type JurisdictionalFlag =
  | 'us_person'
  | 'eu_mifid'
  | 'uk_fca'
  | 'sg_mas'
  | 'ch_finma'
  | 'sanctioned'
  | 'fatf_high_risk'
  | 'offshore';

export type ChainId =
  | 'ton'
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'solana'
  | 'avalanche'
  | 'bsc'
  | 'cosmos';

export type BridgeType =
  | 'lock_mint'
  | 'burn_mint'
  | 'liquidity_pool'
  | 'atomic_swap'
  | 'optimistic'
  | 'zk_proof';

export type SettlementFinality =
  | 'probabilistic'
  | 'economic'
  | 'absolute'
  | 'fast_finality';

export type AllocationStrategy =
  | 'best_rate'
  | 'lowest_risk'
  | 'fastest_settlement'
  | 'diversified'
  | 'ai_optimized';

export type NettingMode =
  | 'bilateral'
  | 'multilateral'
  | 'continuous'
  | 'periodic';

export type MarginPortability =
  | 'full'
  | 'partial'
  | 'none';

export type GovernanceAction =
  | 'parameter_update'
  | 'provider_approval'
  | 'consumer_approval'
  | 'emergency_pause'
  | 'fee_adjustment'
  | 'risk_limit_change';

export type IPLSEventType =
  | 'provider_registered'
  | 'provider_updated'
  | 'provider_removed'
  | 'consumer_registered'
  | 'consumer_updated'
  | 'liquidity_requested'
  | 'liquidity_returned'
  | 'liquidity_routed'
  | 'passport_issued'
  | 'passport_updated'
  | 'passport_revoked'
  | 'risk_assessed'
  | 'risk_alert'
  | 'clearing_initiated'
  | 'clearing_settled'
  | 'adapter_connected'
  | 'adapter_disconnected'
  | 'governance_proposal'
  | 'governance_executed'
  | 'emergency_pause'
  | 'system_resumed';

// ============================================================================
// IPLS v1 Core Interfaces — LiquidityProvider
// ============================================================================

export interface LiquidityProvider {
  id: ProtocolId;
  name: string;
  type: ProtocolType;
  status: LiquidityProviderStatus;
  chainIds: ChainId[];
  supportedAssets: string[];
  capabilities: ProviderCapabilities;
  riskProfile: ProviderRiskProfile;
  clearingConfig: ClearingConfig;
  feeSchedule: FeeSchedule;
  limits: ProviderLimits;
  compliance: ProviderCompliance;
  metadata: ProviderMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderCapabilities {
  canDeposit: boolean;
  canWithdraw: boolean;
  canQuote: boolean;
  canRoute: boolean;
  canReportExposure: boolean;
  canCrossChain: boolean;
  supportedNettingModes: NettingMode[];
  maxConcurrentRequests: number;
  minLiquidityDepth: string;
  maxResponseTimeMs: number;
}

export interface ProviderRiskProfile {
  riskTier: RiskTier;
  riskScore: number; // 0–100, higher = riskier
  auditScore: number; // 0–100, higher = better
  smartContractRisk: SmartContractRisk;
  liquidityDepthMetrics: LiquidityDepthMetrics;
  volatilityMetrics: VolatilityMetrics;
  lastAuditDate: Date;
  nextAuditDate: Date;
  auditFirm?: string;
}

export interface SmartContractRisk {
  auditsPassed: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  mediumVulnerabilities: number;
  lastAuditHash?: string;
  upgradeability: 'immutable' | 'upgradeable_multisig' | 'upgradeable_timelock' | 'unverified';
  bugBountyProgram: boolean;
  insuranceCoverage: string; // USD value
}

export interface LiquidityDepthMetrics {
  totalValueLocked: string; // USD
  avgDailyVolume: string; // USD
  maxSingleWithdrawal: string; // USD
  withdrawalQueue24h: string; // USD
  utilizationRate: number; // 0–1
  concentrationRisk: number; // 0–1, higher = more concentrated
}

export interface VolatilityMetrics {
  dailyVolatility30d: number;
  weeklyVolatility: number;
  maxDrawdown30d: number;
  sharpeRatio: number;
  correlationToMarket: number;
}

export interface ClearingConfig {
  nettingMode: NettingMode;
  settlementFinality: SettlementFinality;
  settlementCycleMs: number;
  marginPortability: MarginPortability;
  acceptedCollateral: string[];
  haircuts: Record<string, number>; // asset -> haircut %
  minimumMargin: string; // USD
  autoRebalance: boolean;
}

export interface FeeSchedule {
  depositFee: number; // basis points
  withdrawalFee: number; // basis points
  routingFee: number; // basis points
  flashFee: number; // basis points
  performanceFee: number; // percentage
  volumeDiscounts: ProviderVolumeDiscount[];
  feeAsset: string;
  feeRecipient: string;
}

export interface ProviderVolumeDiscount {
  volumeThreshold: string; // USD
  discountBps: number;
}

export interface ProviderLimits {
  dailyDepositLimit: string;
  dailyWithdrawalLimit: string;
  singleTransactionLimit: string;
  totalExposureLimit: string;
  maxConsumersPerCycle: number;
  cooldownPeriodMs: number;
}

export interface ProviderCompliance {
  status: ComplianceStatus;
  jurisdictions: string[];
  licenses: string[];
  kycRequired: boolean;
  amlRequired: boolean;
  allowedJurisdictions: string[];
  restrictedJurisdictions: string[];
  lastComplianceCheck: Date;
}

export interface ProviderMetadata {
  website: string;
  documentation: string;
  github?: string;
  twitter?: string;
  contactEmail: string;
  description: string;
  tags: string[];
  version: string;
  ipfsSpec?: string; // IPFS hash of full IPLS spec
}

// ============================================================================
// IPLS v1 Core Interfaces — LiquidityConsumer
// ============================================================================

export interface LiquidityConsumer {
  id: ProtocolId;
  name: string;
  type: ProtocolType;
  status: LiquidityConsumerStatus;
  requestedChains: ChainId[];
  preferredAssets: string[];
  requirements: ConsumerRequirements;
  riskLimits: ConsumerRiskLimits;
  passport: LiquidityPassport | null;
  activeRequests: LiquidityRequestId[];
  metadata: ConsumerMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsumerRequirements {
  minProviderRiskTier: RiskTier;
  minLiquidityDepth: string;
  maxFeesBps: number;
  requiredSettlementFinality: SettlementFinality;
  requiredNettingModes: NettingMode[];
  preferredStrategy: AllocationStrategy;
  maxProviderCount: number;
  requireAudit: boolean;
  requireInsurance: boolean;
}

export interface ConsumerRiskLimits {
  maxSingleExposure: string;
  maxTotalExposure: string;
  maxExposurePerChain: Record<ChainId, string>;
  maxCounterpartyConcentration: number; // 0–1
  stopLossThreshold: number; // percentage
  requiredCollateralizationRatio: number;
}

export interface ConsumerMetadata {
  contactEmail: string;
  description: string;
  onboardedAt: Date;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'expired';
  approvedBy?: string;
  tags: string[];
}

// ============================================================================
// Liquidity Request and Response
// ============================================================================

export interface LiquidityRequest {
  id: LiquidityRequestId;
  consumerId: ProtocolId;
  asset: string;
  amount: string;
  targetChain: ChainId;
  urgency: 'standard' | 'high' | 'critical';
  strategy: AllocationStrategy;
  maxFeeBps: number;
  deadline: Date;
  collateralOffered?: string;
  collateralAmount?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface LiquidityResponse {
  requestId: LiquidityRequestId;
  providerId: ProtocolId;
  approved: boolean;
  allocatedAmount: string;
  allocatedAsset: string;
  fee: string;
  feeBps: number;
  route: LiquidityRoute;
  estimatedSettlementMs: number;
  expiresAt: Date;
  rejectionReason?: string;
}

export interface LiquidityRoute {
  id: string;
  steps: RouteStep[];
  totalFee: string;
  estimatedGas: string;
  estimatedTimeMs: number;
  bridgesUsed: string[];
  riskScore: number;
  confidence: number;
}

export interface RouteStep {
  order: number;
  fromChain: ChainId;
  toChain: ChainId;
  asset: string;
  amount: string;
  protocol: string;
  action: 'deposit' | 'bridge' | 'swap' | 'withdraw' | 'wrap' | 'unwrap';
  estimatedTimeMs: number;
  estimatedFee: string;
  contractAddress?: string;
}

// ============================================================================
// Exposure Report
// ============================================================================

export interface ExposureReport {
  reportId: string;
  reporterId: ProtocolId;
  timestamp: Date;
  exposures: ProtocolExposure[];
  totalExposureUsd: string;
  netExposureUsd: string;
  riskBreakdown: Record<ExposureType, string>;
  topCounterparties: CounterpartyExposure[];
}

export interface ProtocolExposure {
  counterpartyId: ProtocolId;
  counterpartyName: string;
  asset: string;
  grossExposure: string;
  netExposure: string;
  exposureType: ExposureType;
  chainId: ChainId;
  collateralCoverage: number; // 0–1
  marginCallThreshold: string;
}

export interface CounterpartyExposure {
  protocolId: ProtocolId;
  protocolName: string;
  totalExposureUsd: string;
  concentrationRatio: number;
  riskRating: RiskTier;
}

// ============================================================================
// Cross-Protocol Risk Module
// ============================================================================

export interface CrossProtocolRiskAssessment {
  id: RiskAssessmentId;
  subjectId: ProtocolId;
  assessorId: string;
  timestamp: Date;
  overallScore: number; // 0–100, lower = safer
  riskTier: RiskTier;
  dimensions: RiskDimensions;
  alerts: RiskAlert[];
  recommendations: string[];
  aiInsights?: AIRiskInsights;
  validUntil: Date;
}

export interface RiskDimensions {
  protocolExposure: ProtocolExposureRisk;
  liquidityDepth: LiquidityDepthRisk;
  volatility: VolatilityRisk;
  smartContract: SmartContractRiskScore;
  operational: OperationalRisk;
  concentration: ConcentrationRisk;
  crossChain: CrossChainRisk;
}

export interface ProtocolExposureRisk {
  score: number;
  totalExposureUsd: string;
  largestSingleExposureUsd: string;
  exposureConcentration: number;
  uncollateralizedExposure: string;
  details: string;
}

export interface LiquidityDepthRisk {
  score: number;
  depth24h: string;
  utilizationRate: number;
  withdrawalConcentration: number;
  liquidityCoverage: number;
  details: string;
}

export interface VolatilityRisk {
  score: number;
  impliedVolatility30d: number;
  recentMaxDrawdown: number;
  correlationToSystemicRisk: number;
  tailRiskScore: number;
  details: string;
}

export interface SmartContractRiskScore {
  score: number;
  auditScore: number;
  upgradeabilityRisk: number;
  composabilityRisk: number;
  knownExploits: number;
  details: string;
}

export interface OperationalRisk {
  score: number;
  uptimePercent: number;
  incidentCount30d: number;
  meanTimeToRecovery: number; // minutes
  backupSystems: boolean;
  details: string;
}

export interface ConcentrationRisk {
  score: number;
  topProviderShare: number;
  giniCoefficient: number;
  herfindahlIndex: number;
  details: string;
}

export interface CrossChainRisk {
  score: number;
  bridgesUsed: number;
  bridgeAuditScore: number;
  crossChainExposure: string;
  bridgeFailureScenario: string;
  details: string;
}

export interface RiskAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  type: string;
  message: string;
  affectedProtocol?: ProtocolId;
  threshold?: number;
  currentValue?: number;
  recommendedAction: string;
  timestamp: Date;
  resolved: boolean;
}

export interface AIRiskInsights {
  modelVersion: string;
  confidenceScore: number;
  predictedRiskTrend: 'improving' | 'stable' | 'deteriorating';
  keyRiskFactors: string[];
  capitalAllocationRecommendation: CapitalAllocationRecommendation;
  scenarioAnalysis: RiskScenario[];
  generatedAt: Date;
}

export interface CapitalAllocationRecommendation {
  providerId: ProtocolId;
  currentAllocationUsd: string;
  recommendedAllocationUsd: string;
  allocationChange: number; // percentage change
  rationale: string;
  confidence: number;
}

export interface RiskScenario {
  name: string;
  probability: number;
  impact: 'low' | 'medium' | 'high' | 'catastrophic';
  estimatedLossUsd: string;
  description: string;
  mitigationActions: string[];
}

// ============================================================================
// Liquidity Passport System
// ============================================================================

export interface LiquidityPassport {
  id: PassportId;
  holderId: ProtocolId;
  holderName: string;
  issuedBy: string;
  capitalOrigin: CapitalOrigin;
  riskProfile: PassportRiskProfile;
  complianceStatus: PassportCompliance;
  jurisdictionalFlags: JurisdictionalFlag[];
  creditHistory: CreditHistoryEntry[];
  endorsements: PassportEndorsement[];
  version: number;
  issuedAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  revocationReason?: string;
  ipfsHash?: string; // on-chain reference
}

export interface CapitalOrigin {
  primaryChain: ChainId;
  sourceProtocols: string[];
  capitalType: 'native' | 'bridged' | 'synthetic' | 'rwa_backed' | 'mixed';
  originVerified: boolean;
  originProof?: string; // ZK proof or merkle proof reference
  totalVerifiedCapital: string; // USD
  segregatedAssets: boolean;
  lastVerification: Date;
}

export interface PassportRiskProfile {
  riskTier: RiskTier;
  compositeScore: number;
  liquidityScore: number;
  creditScore: number;
  operationalScore: number;
  complianceScore: number;
  historicalDefault: boolean;
  maxHistoricalDrawdown: number;
  averageReturnRate: number;
  scoringModelVersion: string;
  lastScored: Date;
}

export interface PassportCompliance {
  status: ComplianceStatus;
  kycLevel: 'basic' | 'enhanced' | 'institutional';
  kycProvider: string;
  kycCompletedAt: Date;
  kycExpiresAt: Date;
  amlScreened: boolean;
  amlScreenedAt: Date;
  sanctions: boolean;
  pep: boolean; // politically exposed person
  approvedProducts: string[];
  restrictions: string[];
}

export interface CreditHistoryEntry {
  id: string;
  eventType: 'borrow' | 'repay' | 'default' | 'partial_default' | 'early_repay' | 'restructure';
  amount: string;
  asset: string;
  counterpartyId: ProtocolId;
  outcome: 'on_time' | 'late' | 'default' | 'restructured';
  daysLate?: number;
  timestamp: Date;
}

export interface PassportEndorsement {
  endorserId: string;
  endorserName: string;
  endorsementType: 'liquidity' | 'compliance' | 'technical' | 'risk';
  score: number;
  comment: string;
  issuedAt: Date;
  validUntil: Date;
}

// ============================================================================
// Cross-Chain Execution Adapter Layer
// ============================================================================

export interface CrossChainAdapter {
  id: AdapterId;
  name: string;
  bridgeType: BridgeType;
  supportedChains: ChainId[];
  supportedAssets: string[];
  status: 'active' | 'inactive' | 'maintenance' | 'deprecated';
  config: AdapterConfig;
  metrics: AdapterMetrics;
  gasConfig: GasConfig;
  failoverConfig: FailoverConfig;
  vaultConfig?: CrossChainVaultConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdapterConfig {
  contractAddresses: Record<ChainId, string>;
  relayerEndpoints: string[];
  confirmationsRequired: Record<ChainId, number>;
  maxTransferAmount: string;
  minTransferAmount: string;
  timeout: number; // ms
  retryPolicy: AdapterRetryPolicy;
  securityMode: 'optimistic' | 'zk_verified' | 'multisig' | 'light_client';
}

export interface AdapterRetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface AdapterMetrics {
  totalTransfers: number;
  totalVolumeUsd: string;
  successRate: number;
  averageTimeMs: number;
  averageFeeUsd: string;
  failureCount30d: number;
  lastTransferAt: Date;
  uptimePercent: number;
}

export interface GasConfig {
  gasEstimationBuffer: number; // multiplier, e.g. 1.2
  maxGasPriceGwei: Record<ChainId, number>;
  priorityFeeGwei: Record<ChainId, number>;
  gasLimitOverrides: Record<string, number>; // action -> gas limit
  dynamicGasPricing: boolean;
  gasTokenFallback: Record<ChainId, string>;
}

export interface FailoverConfig {
  enabled: boolean;
  alternateAdapters: AdapterId[];
  maxFailoverAttempts: number;
  circuitBreakerThreshold: number; // failure count before tripping
  circuitBreakerResetMs: number;
  autoFailback: boolean;
}

export interface CrossChainVaultConfig {
  vaultAddresses: Record<ChainId, string>;
  rebalanceThreshold: number; // percentage imbalance before rebalance
  rebalanceStrategy: 'proportional' | 'target_weight' | 'greedy';
  targetWeights: Record<ChainId, number>;
  autoRebalance: boolean;
  rebalanceIntervalMs: number;
}

// ============================================================================
// Cross-Protocol Clearing Compatibility
// ============================================================================

export interface ClearingSession {
  id: ClearingSessionId;
  participants: ProtocolId[];
  nettingMode: NettingMode;
  status: 'open' | 'netting' | 'margin_check' | 'settling' | 'settled' | 'failed' | 'disputed';
  obligations: ClearingObligation[];
  nettedObligations: NettedObligation[];
  collateralLedger: CollateralEntry[];
  marginRequirements: MarginRequirement[];
  settlementDetails?: SettlementDetails;
  openedAt: Date;
  settledAt?: Date;
  failedAt?: Date;
}

export interface ClearingObligation {
  id: string;
  from: ProtocolId;
  to: ProtocolId;
  asset: string;
  amount: string;
  chain: ChainId;
  dueAt: Date;
  status: 'pending' | 'netted' | 'settled' | 'failed';
}

export interface NettedObligation {
  participants: ProtocolId[];
  asset: string;
  netAmounts: Record<ProtocolId, string>; // positive = receive, negative = pay
  savingsPercent: number; // netting efficiency
}

export interface CollateralEntry {
  providerId: ProtocolId;
  asset: string;
  amount: string;
  haircut: number;
  adjustedValue: string;
  chain: ChainId;
  lockExpiry: Date;
  portable: boolean;
}

export interface MarginRequirement {
  participantId: ProtocolId;
  initialMargin: string;
  maintenanceMargin: string;
  currentMargin: string;
  excessMargin: string;
  marginCallThreshold: string;
  isMarginCallActive: boolean;
}

export interface SettlementDetails {
  finalizedAt: Date;
  settledAmount: string;
  unsettledAmount: string;
  failedParticipants: ProtocolId[];
  penaltiesApplied: Record<ProtocolId, string>;
  finality: SettlementFinality;
}

// ============================================================================
// Protocol-to-Protocol API Layer
// ============================================================================

export interface CapitalRequest {
  id: string;
  fromProtocol: ProtocolId;
  toProtocol: ProtocolId;
  requestType: 'liquidity' | 'collateral' | 'flash_loan' | 'term_loan' | 'credit_line';
  asset: string;
  amount: string;
  duration?: number; // ms, null for flash
  interestRate?: number; // bps
  collateralAsset?: string;
  collateralAmount?: string;
  purpose: string;
  urgency: 'standard' | 'high' | 'critical';
  createdAt: Date;
  expiresAt: Date;
}

export interface ReportingPayload {
  reporterId: ProtocolId;
  reportType: 'exposure' | 'capital_usage' | 'risk_metrics' | 'performance' | 'compliance';
  period: { from: Date; to: Date };
  data: Record<string, unknown>;
  signature?: string;
  schemaVersion: string;
  generatedAt: Date;
}

export interface RiskDisclosure {
  disclosingProtocol: ProtocolId;
  disclosureType: 'routine' | 'material_change' | 'incident' | 'near_miss' | 'stress_test';
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedSystems: string[];
  estimatedImpactUsd?: string;
  description: string;
  mitigationTaken: string;
  resolutionStatus: 'open' | 'mitigated' | 'resolved' | 'monitoring';
  disclosedAt: Date;
  resolvedAt?: Date;
}

export interface GovernanceHook {
  id: string;
  action: GovernanceAction;
  targetModule: string;
  proposedBy: ProtocolId;
  parameters: Record<string, unknown>;
  rationale: string;
  quorumRequired: number; // percentage
  votingDeadline: Date;
  status: 'proposed' | 'voting' | 'approved' | 'rejected' | 'executed' | 'expired';
  votes: GovernanceVote[];
  executedAt?: Date;
  createdAt: Date;
}

export interface GovernanceVote {
  voterId: ProtocolId;
  vote: 'for' | 'against' | 'abstain';
  weight: number;
  rationale?: string;
  timestamp: Date;
}

// ============================================================================
// IPLS Events
// ============================================================================

export interface IPLSEvent {
  id: string;
  timestamp: Date;
  type: IPLSEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  sourceId: string;
  action: string;
  description: string;
  details: Record<string, unknown>;
  affectedProtocols: ProtocolId[];
  metadata: Record<string, unknown>;
}

export type IPLSEventCallback = (event: IPLSEvent) => void;

// ============================================================================
// IPLS Configuration
// ============================================================================

export interface IPLSConfig {
  enabled: boolean;
  version: string;
  defaultAllocationStrategy: AllocationStrategy;
  maxProviders: number;
  maxConsumers: number;
  riskAssessmentIntervalMs: number;
  passportExpiryDays: number;
  clearingEnabled: boolean;
  defaultNettingMode: NettingMode;
  aiRiskEnabled: boolean;
  crossChainEnabled: boolean;
  governanceEnabled: boolean;
  riskModuleConfig?: Partial<RiskModuleConfig>;
  passportConfig?: Partial<PassportConfig>;
  adapterLayerConfig?: Partial<AdapterLayerConfig>;
  protocolApiConfig?: Partial<ProtocolApiConfig>;
}

export interface RiskModuleConfig {
  enabled: boolean;
  assessmentIntervalMs: number;
  alertThresholds: Record<string, number>;
  aiModelEnabled: boolean;
  historicalWindowDays: number;
  stressTestEnabled: boolean;
}

export interface PassportConfig {
  enabled: boolean;
  expiryDays: number;
  requireKyc: boolean;
  requireAml: boolean;
  autoRenewal: boolean;
  endorsementRequired: boolean;
}

export interface AdapterLayerConfig {
  enabled: boolean;
  defaultFailover: boolean;
  gasBufferMultiplier: number;
  vaultRebalanceEnabled: boolean;
  maxConcurrentBridges: number;
}

export interface ProtocolApiConfig {
  enabled: boolean;
  reportingIntervalMs: number;
  governanceEnabled: boolean;
  maxConcurrentRequests: number;
  requestTimeoutMs: number;
}

// ============================================================================
// Health Check
// ============================================================================

export interface IPLSHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  providerCount: number;
  activeProviders: number;
  consumerCount: number;
  activeConsumers: number;
  adapterCount: number;
  activeAdapters: number;
  openClearingSessions: number;
  lastHealthCheck: Date;
  issues: string[];
}
