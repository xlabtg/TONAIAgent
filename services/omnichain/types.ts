/**
 * TONAIAgent - Omnichain Agent Infrastructure Type Definitions
 *
 * Core types for enabling autonomous agents to operate across multiple blockchains
 * while maintaining a TON-first execution environment.
 *
 * Features:
 * - Cross-chain capital movement
 * - Arbitrage and liquidity access
 * - Hedging and diversification
 * - Unified portfolio control
 * - ChangeNOW integration for 200+ chains and 1200+ assets
 */

// ============================================================================
// Chain and Asset Types
// ============================================================================

/**
 * Supported blockchain networks
 * Initial support: TON (primary), Ethereum, Solana, BNB Chain, Polygon, Arbitrum, Optimism
 * Expandable via ChangeNOW API
 */
export type ChainId =
  | 'ton'
  | 'eth'
  | 'sol'
  | 'bnb'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'avalanche'
  | 'base'
  | 'fantom'
  | 'cosmos'
  | 'tron'
  | string; // Allow dynamic chains via ChangeNOW

export type ChainType =
  | 'evm'       // Ethereum-compatible chains
  | 'ton'       // The Open Network
  | 'solana'    // Solana ecosystem
  | 'cosmos'    // Cosmos SDK chains
  | 'other';    // Other chain types

export interface ChainInfo {
  id: ChainId;
  name: string;
  type: ChainType;
  ticker: string;
  decimals: number;
  explorerUrl: string;
  rpcEndpoint?: string;
  nativeCurrency: string;
  isEnabled: boolean;
  isPrimary: boolean; // TON is always primary
  avgBlockTime: number;
  avgConfirmationTime: number;
  metadata?: Record<string, unknown>;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  chainId: ChainId;
  contractAddress?: string; // Native assets don't have contract
  decimals: number;
  logoUrl?: string;
  isNative: boolean;
  isStablecoin: boolean;
  priceUsd?: number;
  marketCap?: number;
  volume24h?: number;
  hasExternalId: boolean;
  externalId?: string; // ChangeNOW identifier
  metadata?: Record<string, unknown>;
}

export interface AssetPair {
  fromAsset: Asset;
  toAsset: Asset;
  isAvailable: boolean;
  minAmount: string;
  maxAmount?: string;
  estimatedRate?: number;
  estimatedFee?: string;
}

// ============================================================================
// ChangeNOW Integration Types
// ============================================================================

export interface ChangeNowConfig {
  apiKey: string;
  apiVersion: 'v1' | 'v2';
  baseUrl: string;
  timeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
  rateLimitPerSecond: number;
}

export interface ChangeNowCurrency {
  ticker: string;
  name: string;
  image: string;
  hasExternalId: boolean;
  isFiat: boolean;
  featured: boolean;
  isStable: boolean;
  supportsFixedRate: boolean;
  network: string;
  tokenContract?: string;
  buy: boolean;
  sell: boolean;
}

export interface ChangeNowEstimate {
  estimatedAmount: string;
  transactionSpeedForecast: string;
  warningMessage?: string;
  rateId?: string;
  validUntil?: string;
  fromAmount: string;
  toAmount: string;
  fromCurrency: string;
  toCurrency: string;
  networkFee?: string;
}

export interface ChangeNowMinAmount {
  minAmount: string;
  fromCurrency: string;
  toCurrency: string;
}

export interface ChangeNowTransaction {
  id: string;
  status: ChangeNowTransactionStatus;
  payinAddress: string;
  payoutAddress: string;
  payinExtraId?: string;
  payoutExtraId?: string;
  fromCurrency: string;
  toCurrency: string;
  expectedAmountFrom: string;
  expectedAmountTo: string;
  amountFrom?: string;
  amountTo?: string;
  createdAt: string;
  updatedAt: string;
  validUntil?: string;
  payinHash?: string;
  payoutHash?: string;
  networkFee?: string;
}

export type ChangeNowTransactionStatus =
  | 'new'
  | 'waiting'
  | 'confirming'
  | 'exchanging'
  | 'sending'
  | 'finished'
  | 'failed'
  | 'refunded'
  | 'verifying'
  | 'expired';

export interface CreateExchangeRequest {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: string;
  address: string;
  extraId?: string;
  refundAddress?: string;
  refundExtraId?: string;
  userId?: string;
  contactEmail?: string;
  rateId?: string; // For fixed rate exchanges
}

export interface CreateExchangeResponse {
  id: string;
  payinAddress: string;
  payinExtraId?: string;
  payoutAddress: string;
  payoutExtraId?: string;
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  validUntil?: string;
}

// ============================================================================
// Cross-Chain Transaction Types
// ============================================================================

export type CrossChainTransactionType =
  | 'swap'
  | 'bridge'
  | 'transfer'
  | 'arbitrage'
  | 'yield_rotation'
  | 'hedging'
  | 'rebalance';

export type CrossChainTransactionStatus =
  | 'pending'
  | 'awaiting_deposit'
  | 'confirming'
  | 'exchanging'
  | 'sending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'expired'
  | 'cancelled';

export interface CrossChainTransaction {
  id: string;
  type: CrossChainTransactionType;
  status: CrossChainTransactionStatus;
  agentId: string;
  userId: string;
  sourceChain: ChainId;
  destinationChain: ChainId;
  sourceAsset: Asset;
  destinationAsset: Asset;
  sourceAmount: string;
  expectedDestinationAmount: string;
  actualDestinationAmount?: string;
  sourceAddress: string;
  destinationAddress: string;
  depositAddress?: string;
  sourceTransactionHash?: string;
  destinationTransactionHash?: string;
  exchangeProvider: 'changenow' | 'other';
  exchangeId?: string;
  estimatedFee: string;
  actualFee?: string;
  slippagePercent?: number;
  priceAtCreation: number;
  priceAtCompletion?: number;
  riskScore: number;
  strategyId?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
  retryCount: number;
  maxRetries: number;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

export interface CrossChainTransactionRequest {
  type: CrossChainTransactionType;
  agentId: string;
  userId: string;
  sourceChain: ChainId;
  destinationChain: ChainId;
  sourceAssetId: string;
  destinationAssetId: string;
  sourceAmount: string;
  destinationAddress: string;
  slippageTolerance?: number;
  priority?: TransactionPriority;
  strategyId?: string;
  refundAddress?: string;
  deadline?: Date;
  metadata?: Record<string, unknown>;
}

export type TransactionPriority = 'low' | 'normal' | 'high' | 'urgent';

// ============================================================================
// Portfolio Types
// ============================================================================

export interface CrossChainPortfolio {
  id: string;
  userId: string;
  agentId?: string;
  totalValueUsd: number;
  totalValueTon: number;
  holdings: CrossChainHolding[];
  chainAllocations: ChainAllocation[];
  exposure: ExposureMetrics;
  riskMetrics: PortfolioRiskMetrics;
  lastUpdated: Date;
  syncStatus: PortfolioSyncStatus;
}

export interface CrossChainHolding {
  asset: Asset;
  balance: string;
  balanceUsd: number;
  balanceTon: number;
  percentOfPortfolio: number;
  averageCost?: number;
  unrealizedPnl?: number;
  unrealizedPnlPercent?: number;
  lastSyncedAt: Date;
  isLocked: boolean;
  lockedReason?: string;
}

export interface ChainAllocation {
  chainId: ChainId;
  chainName: string;
  valueUsd: number;
  valueTon: number;
  percentOfPortfolio: number;
  assetCount: number;
  isWhitelisted: boolean;
}

export interface ExposureMetrics {
  stablecoinPercent: number;
  volatilePercent: number;
  defiExposurePercent: number;
  nativeTokenPercent: number;
  largestPositionPercent: number;
  top3PositionsPercent: number;
  chainConcentration: Record<ChainId, number>;
  assetConcentration: Record<string, number>;
}

export interface PortfolioRiskMetrics {
  overallRiskScore: number;
  chainRiskScore: number;
  assetRiskScore: number;
  concentrationRiskScore: number;
  liquidityRiskScore: number;
  volatilityScore: number;
  correlationRisk: number;
  maxDrawdown24h: number;
  maxDrawdown7d: number;
  valueAtRisk95: number;
  lastCalculated: Date;
}

export type PortfolioSyncStatus =
  | 'synced'
  | 'syncing'
  | 'partial'
  | 'stale'
  | 'error';

// ============================================================================
// Cross-Chain Strategy Types
// ============================================================================

export type CrossChainStrategyType =
  | 'arbitrage'
  | 'yield_rotation'
  | 'stablecoin_diversification'
  | 'hedging'
  | 'volatility'
  | 'rebalancing'
  | 'dca'
  | 'custom';

export interface CrossChainStrategy {
  id: string;
  name: string;
  description: string;
  type: CrossChainStrategyType;
  userId: string;
  agentId: string;
  status: CrossChainStrategyStatus;
  config: CrossChainStrategyConfig;
  performance: CrossChainStrategyPerformance;
  allowedChains: ChainId[];
  allowedAssets: string[];
  capitalAllocation: StrategyCapitalAllocation;
  riskParameters: StrategyRiskParameters;
  executionRules: StrategyExecutionRules;
  createdAt: Date;
  updatedAt: Date;
  lastExecutedAt?: Date;
  metadata?: Record<string, unknown>;
}

export type CrossChainStrategyStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'stopped'
  | 'error';

export interface CrossChainStrategyConfig {
  triggerConditions: StrategyTrigger[];
  actions: StrategyAction[];
  fallbackActions?: StrategyAction[];
  checkIntervalMinutes: number;
  maxConcurrentExecutions: number;
  cooldownMinutes: number;
}

export interface StrategyTrigger {
  id: string;
  type: TriggerType;
  condition: TriggerCondition;
  parameters: Record<string, unknown>;
  priority: number;
}

export type TriggerType =
  | 'price_threshold'
  | 'yield_differential'
  | 'portfolio_drift'
  | 'time_based'
  | 'external_signal'
  | 'chain_event';

export interface TriggerCondition {
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between';
  value: number | number[];
  asset?: string;
  chain?: ChainId;
}

export interface StrategyAction {
  id: string;
  type: ActionType;
  parameters: Record<string, unknown>;
  priority: number;
  conditions?: ActionCondition[];
}

export type ActionType =
  | 'swap'
  | 'bridge'
  | 'stake'
  | 'unstake'
  | 'provide_liquidity'
  | 'remove_liquidity'
  | 'rebalance'
  | 'alert'
  | 'pause_strategy';

export interface ActionCondition {
  check: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
  value: number;
}

export interface StrategyCapitalAllocation {
  maxTotalCapitalPercent: number;
  maxPerChainPercent: number;
  maxPerAssetPercent: number;
  maxPerTransactionPercent: number;
  reserveCapitalPercent: number;
}

export interface StrategyRiskParameters {
  maxSlippagePercent: number;
  maxGasCostPercent: number;
  maxSingleLossPercent: number;
  maxDrawdownPercent: number;
  maxExposurePerChain: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;
}

export interface StrategyExecutionRules {
  executionWindow?: ExecutionWindow;
  minConfirmations: number;
  maxRetries: number;
  retryDelayMinutes: number;
  requireApprovalAbove?: number;
}

export interface ExecutionWindow {
  timezone: string;
  startHour: number;
  endHour: number;
  allowedDays: number[]; // 0-6, Sunday = 0
}

export interface CrossChainStrategyPerformance {
  totalPnl: number;
  totalPnlPercent: number;
  winRate: number;
  averageReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  transactionsCount: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalFeesUsd: number;
  totalGasCostUsd: number;
  period: 'day' | 'week' | 'month' | 'all_time';
  lastUpdated: Date;
}

// ============================================================================
// Risk and Security Types
// ============================================================================

export type OmnichainRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ChainRiskProfile {
  chainId: ChainId;
  overallRiskScore: number;
  bridgeRiskScore: number;
  liquidityRiskScore: number;
  smartContractRiskScore: number;
  regulatoryRiskScore: number;
  operationalRiskScore: number;
  isWhitelisted: boolean;
  maxAllowedExposure: number;
  warnings: RiskWarning[];
  lastAssessed: Date;
}

export interface RiskWarning {
  id: string;
  level: OmnichainRiskLevel;
  category: RiskWarningCategory;
  message: string;
  recommendation: string;
  dismissible: boolean;
  createdAt: Date;
}

export type RiskWarningCategory =
  | 'chain_risk'
  | 'liquidity_risk'
  | 'slippage_risk'
  | 'bridge_risk'
  | 'smart_contract_risk'
  | 'regulatory_risk'
  | 'concentration_risk'
  | 'volatility_risk';

export interface TransactionRiskAssessment {
  transactionId: string;
  overallRiskScore: number;
  riskLevel: OmnichainRiskLevel;
  factors: RiskFactor[];
  warnings: RiskWarning[];
  recommendation: RiskRecommendation;
  requiresApproval: boolean;
  approvalReason?: string;
}

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  contribution: number;
  description: string;
}

export type RiskRecommendation =
  | 'proceed'
  | 'proceed_with_caution'
  | 'reduce_amount'
  | 'wait_for_better_conditions'
  | 'reject';

export interface SecurityPolicy {
  id: string;
  name: string;
  enabled: boolean;
  chainWhitelist: ChainId[];
  assetWhitelist: string[];
  maxTransactionValue: number;
  maxDailyVolume: number;
  requireMultiSigAbove: number;
  emergencyHaltEnabled: boolean;
  rules: PolicyRule[];
}

export interface PolicyRule {
  id: string;
  type: PolicyRuleType;
  condition: string;
  action: PolicyAction;
  priority: number;
}

export type PolicyRuleType =
  | 'amount_limit'
  | 'chain_restriction'
  | 'asset_restriction'
  | 'time_restriction'
  | 'velocity_limit'
  | 'concentration_limit';

export type PolicyAction =
  | 'allow'
  | 'deny'
  | 'require_approval'
  | 'alert'
  | 'rate_limit';

// ============================================================================
// Monitoring and Observability Types
// ============================================================================

export interface OmnichainEvent {
  id: string;
  timestamp: Date;
  type: OmnichainEventType;
  source: string;
  chainId?: ChainId;
  agentId?: string;
  userId?: string;
  transactionId?: string;
  strategyId?: string;
  severity: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  message: string;
  data: Record<string, unknown>;
  tags?: string[];
}

export type OmnichainEventType =
  | 'transaction_created'
  | 'transaction_pending'
  | 'transaction_confirming'
  | 'transaction_completed'
  | 'transaction_failed'
  | 'strategy_triggered'
  | 'strategy_executed'
  | 'strategy_error'
  | 'portfolio_synced'
  | 'portfolio_rebalanced'
  | 'risk_alert'
  | 'rate_alert'
  | 'liquidity_alert'
  | 'chain_status_change'
  | 'api_error'
  | 'emergency_halt';

export interface OmnichainMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalVolumeUsd: number;
  totalFeesUsd: number;
  averageExecutionTimeMs: number;
  averageSlippage: number;
  chainUtilization: Record<ChainId, number>;
  assetVolumes: Record<string, number>;
  errorRates: Record<string, number>;
  apiLatency: ApiLatencyMetrics;
  timestamp: Date;
}

export interface ApiLatencyMetrics {
  averageMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  errorRate: number;
  requestsPerMinute: number;
}

export interface ExecutionLog {
  id: string;
  transactionId: string;
  timestamp: Date;
  step: ExecutionStep;
  status: 'started' | 'completed' | 'failed';
  durationMs: number;
  details: Record<string, unknown>;
  error?: string;
}

export type ExecutionStep =
  | 'validation'
  | 'rate_estimation'
  | 'risk_assessment'
  | 'approval_check'
  | 'exchange_creation'
  | 'deposit_detection'
  | 'exchange_processing'
  | 'withdrawal_initiated'
  | 'withdrawal_confirmed'
  | 'portfolio_update';

// ============================================================================
// Cost Optimization Types
// ============================================================================

export interface CostOptimizationConfig {
  enabled: boolean;
  optimizeGas: boolean;
  optimizeRouting: boolean;
  batchTransactions: boolean;
  maxGasPriceGwei?: number;
  preferredProviders: string[];
  costThresholdUsd?: number;
}

export interface RouteOption {
  id: string;
  provider: string;
  fromChain: ChainId;
  toChain: ChainId;
  fromAsset: string;
  toAsset: string;
  estimatedAmount: string;
  estimatedFee: string;
  estimatedGas: string;
  estimatedTimeMinutes: number;
  priceImpactPercent: number;
  score: number;
  isRecommended: boolean;
  warnings: string[];
}

export interface GasEstimate {
  chainId: ChainId;
  gasPrice: string;
  gasLimit: string;
  totalCostNative: string;
  totalCostUsd: number;
  estimatedTime: string;
  priority: 'slow' | 'normal' | 'fast';
}

export interface TransactionBatch {
  id: string;
  transactions: string[];
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
  totalCount: number;
  completedCount: number;
  failedCount: number;
  estimatedSavingsUsd: number;
  actualSavingsUsd?: number;
  createdAt: Date;
  processedAt?: Date;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface OmnichainConfig {
  enabled: boolean;
  primaryChain: ChainId;
  supportedChains: ChainId[];
  changeNow: ChangeNowConfig;
  portfolio: PortfolioConfig;
  strategy: StrategyConfig;
  risk: OmnichainRiskConfig;
  monitoring: MonitoringConfig;
  costOptimization: CostOptimizationConfig;
}

export interface PortfolioConfig {
  syncIntervalMinutes: number;
  staleThresholdMinutes: number;
  enableRealtimeUpdates: boolean;
  trackHistoricalData: boolean;
  retentionDays: number;
}

export interface StrategyConfig {
  maxActiveStrategies: number;
  defaultCheckIntervalMinutes: number;
  maxConcurrentExecutions: number;
  emergencyPauseEnabled: boolean;
}

export interface OmnichainRiskConfig {
  enabled: boolean;
  maxRiskScoreAllowed: number;
  requireApprovalAbove: number;
  chainRiskWeights: Record<ChainId, number>;
  concentrationLimits: ConcentrationLimits;
  velocityLimits: OmnichainVelocityLimits;
}

export interface ConcentrationLimits {
  maxPerChain: number;
  maxPerAsset: number;
  maxVolatileAssets: number;
  minStablecoinReserve: number;
}

export interface OmnichainVelocityLimits {
  maxTransactionsPerHour: number;
  maxTransactionsPerDay: number;
  maxVolumePerHour: number;
  maxVolumePerDay: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  logLevel: 'debug' | 'info' | 'warning' | 'error';
  metricsEnabled: boolean;
  alertsEnabled: boolean;
  eventRetentionDays: number;
  alertChannels: AlertChannel[];
}

export interface AlertChannel {
  type: 'webhook' | 'email' | 'telegram';
  endpoint: string;
  minSeverity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
}

// ============================================================================
// Event Callbacks
// ============================================================================

export type OmnichainEventCallback = (event: OmnichainEvent) => void;

// ============================================================================
// Result Types
// ============================================================================

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: OmnichainError;
  warnings?: string[];
  executionTime: number;
}

export interface OmnichainError {
  code: OmnichainErrorCode;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  suggestedAction?: string;
}

export type OmnichainErrorCode =
  | 'INVALID_CHAIN'
  | 'INVALID_ASSET'
  | 'INSUFFICIENT_BALANCE'
  | 'INSUFFICIENT_LIQUIDITY'
  | 'RATE_EXPIRED'
  | 'TRANSACTION_FAILED'
  | 'EXCHANGE_FAILED'
  | 'TIMEOUT'
  | 'API_ERROR'
  | 'RISK_LIMIT_EXCEEDED'
  | 'POLICY_VIOLATION'
  | 'APPROVAL_REQUIRED'
  | 'EMERGENCY_HALT'
  | 'CHAIN_UNAVAILABLE'
  | 'UNKNOWN';
