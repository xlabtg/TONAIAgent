/**
 * TONAIAgent - AI Credit Layer Type Definitions
 *
 * Core types for AI-native credit, lending, and underwriting infrastructure.
 * Supports CoinRabbit integration, autonomous borrowing agents, AI credit scoring,
 * dynamic collateral management, and cross-provider lending abstraction.
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface AICreditConfig {
  lending: LendingConfig;
  borrowing: BorrowingConfig;
  creditScoring: CreditScoringConfig;
  collateralManagement: CollateralManagementConfig;
  underwriting: UnderwritingConfig;
  strategyEngine: LendingStrategyConfig;
  providers: LendingProvidersConfig;
  riskManagement: RiskManagementConfig;
  aiEngine: AIEngineConfig;
}

export interface LendingConfig {
  enabled: boolean;
  defaultProvider: LendingProvider;
  supportedAssets: string[];
  minLoanAmount: string;
  maxLoanAmount: string;
  maxLTV: number; // Maximum loan-to-value ratio (0-1)
  defaultLTV: number;
  interestRateModel: 'fixed' | 'variable' | 'hybrid';
  autoRefinanceEnabled: boolean;
  marginCallThreshold: number; // LTV threshold for margin calls (0-1)
  liquidationThreshold: number; // LTV threshold for liquidation (0-1)
}

export interface BorrowingConfig {
  enabled: boolean;
  autonomousMode: boolean; // Allow AI agents to borrow autonomously
  maxAutonomousBorrow: string;
  requireHumanApproval: boolean;
  approvalThreshold: string; // Amount requiring human approval
  autoRepaymentEnabled: boolean;
  autoCollateralTopUp: boolean;
  maxOpenLoans: number;
  cooldownPeriod: number; // Hours between borrows
}

export interface CreditScoringConfig {
  enabled: boolean;
  scoringModel: 'basic' | 'advanced' | 'ai_powered';
  updateFrequency: 'real_time' | 'hourly' | 'daily';
  minScoreForBorrowing: number;
  factorWeights: CreditFactorWeights;
  aiProvider: 'groq' | 'anthropic' | 'openai';
  aiModelId?: string;
}

export interface CreditFactorWeights {
  walletActivity: number;
  defiHistory: number;
  portfolioStability: number;
  repaymentHistory: number;
  collateralQuality: number;
  accountAge: number;
  behavioralPatterns: number;
}

export interface CollateralManagementConfig {
  enabled: boolean;
  autoMonitoring: boolean;
  monitoringInterval: number; // Seconds
  autoTopUpEnabled: boolean;
  autoTopUpThreshold: number; // LTV threshold (0-1)
  autoTopUpAmount: string;
  hedgingEnabled: boolean;
  hedgingStrategy: HedgingStrategy;
  alertThresholds: AlertThresholds;
}

export interface AlertThresholds {
  marginWarning: number;
  marginCritical: number;
  liquidationImminent: number;
  volatilitySpike: number;
}

export type HedgingStrategy =
  | 'none'
  | 'delta_neutral'
  | 'protective_puts'
  | 'covered_calls'
  | 'dynamic';

export interface UnderwritingConfig {
  enabled: boolean;
  riskModel: 'conservative' | 'moderate' | 'aggressive';
  maxExposure: string;
  diversificationRequired: boolean;
  minDiversificationScore: number;
  volatilityForecastEnabled: boolean;
  macroAwareEnabled: boolean;
}

export interface LendingStrategyConfig {
  enabled: boolean;
  strategies: LendingStrategyType[];
  maxLeverage: number;
  targetAPY: number;
  riskTolerance: 'low' | 'medium' | 'high';
  rebalanceFrequency: 'hourly' | 'daily' | 'weekly';
}

export type LendingStrategyType =
  | 'leveraged_yield_farming'
  | 'delta_neutral'
  | 'funding_rate_arbitrage'
  | 'liquidity_provisioning'
  | 'stablecoin_yield'
  | 'recursive_lending';

export interface LendingProvidersConfig {
  coinrabbit: CoinRabbitConfig;
  defi: DeFiProvidersConfig;
  institutional: InstitutionalConfig;
}

export interface CoinRabbitConfig {
  enabled: boolean;
  apiKey?: string;
  partnerId?: string;
  sandbox: boolean;
  supportedCoins: string[];
  webhookUrl?: string;
}

export interface DeFiProvidersConfig {
  enabled: boolean;
  protocols: string[];
  preferredChains: string[];
}

export interface InstitutionalConfig {
  enabled: boolean;
  providers: string[];
  kycRequired: boolean;
}

export interface RiskManagementConfig {
  enabled: boolean;
  maxPortfolioLeverage: number;
  maxSinglePositionSize: number; // As percentage of portfolio (0-1)
  stopLossEnabled: boolean;
  stopLossThreshold: number;
  circuitBreakerEnabled: boolean;
  circuitBreakerThreshold: number;
  exposureLimits: ExposureLimits;
}

export interface ExposureLimits {
  maxTotalExposure: string;
  maxSingleAssetExposure: string;
  maxProviderExposure: string;
}

export interface AIEngineConfig {
  enabled: boolean;
  provider: 'groq' | 'anthropic' | 'openai';
  modelId: string;
  decisionConfidenceThreshold: number;
  requireHumanReview: boolean;
  learningEnabled: boolean;
}

// ============================================================================
// Loan Types
// ============================================================================

export interface Loan {
  id: string;
  userId: string;
  provider: LendingProvider;
  externalId?: string; // Provider's loan ID
  type: LoanType;
  status: LoanStatus;
  collateral: CollateralInfo;
  principal: LoanAmount;
  interest: InterestInfo;
  ltv: LTVInfo;
  terms: LoanTerms;
  schedule: RepaymentSchedule;
  history: LoanHistoryEntry[];
  alerts: LoanAlert[];
  aiDecisions: AILoanDecision[];
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  metadata: Record<string, unknown>;
}

export type LendingProvider =
  | 'coinrabbit'
  | 'aave'
  | 'compound'
  | 'makerdao'
  | 'evaa'
  | 'tonlend'
  | 'custom';

export type LoanType =
  | 'crypto_backed'
  | 'over_collateralized'
  | 'under_collateralized'
  | 'flash_loan'
  | 'credit_line';

export type LoanStatus =
  | 'pending'
  | 'approved'
  | 'active'
  | 'margin_call'
  | 'liquidation_pending'
  | 'partially_liquidated'
  | 'fully_liquidated'
  | 'repaying'
  | 'closed'
  | 'defaulted'
  | 'cancelled';

export interface CollateralInfo {
  assets: CollateralAsset[];
  totalValue: string;
  totalValueUSD: string;
  lockedValue: string;
  availableValue: string;
  healthFactor: number;
  riskScore: number;
}

export interface CollateralAsset {
  symbol: string;
  name: string;
  amount: string;
  valueUSD: string;
  weight: number;
  volatility: number;
  lockedAt: Date;
  lockTxHash?: string;
}

export interface LoanAmount {
  asset: string;
  amount: string;
  valueUSD: string;
  disbursedAmount: string;
  remainingPrincipal: string;
}

export interface InterestInfo {
  rate: number; // Annual rate as decimal
  type: 'fixed' | 'variable';
  accrued: string;
  paid: string;
  nextPaymentDue?: Date;
  compoundingFrequency: 'continuous' | 'daily' | 'weekly' | 'monthly';
}

export interface LTVInfo {
  current: number;
  initial: number;
  max: number;
  liquidation: number;
  marginCall: number;
  safeZone: number;
}

export interface LoanTerms {
  ltv?: number; // Loan-to-value ratio (0-1) for refinancing
  duration?: number; // Days, undefined for open-ended
  minDuration?: number;
  earlyRepaymentAllowed: boolean;
  earlyRepaymentFee?: number;
  partialRepaymentAllowed: boolean;
  autoExtend: boolean;
  gracePeriod: number; // Days
  fees: LoanFees;
}

export interface LoanFees {
  origination: string;
  maintenance: string;
  lateFee: string;
  liquidationFee: string;
}

export interface RepaymentSchedule {
  type: 'interest_only' | 'amortizing' | 'bullet' | 'flexible';
  payments: ScheduledPayment[];
  nextPayment?: ScheduledPayment;
  totalRemaining: string;
}

export interface ScheduledPayment {
  id: string;
  dueDate: Date;
  principalAmount: string;
  interestAmount: string;
  totalAmount: string;
  status: 'scheduled' | 'pending' | 'paid' | 'overdue' | 'partial';
  paidAt?: Date;
  paidAmount?: string;
  txHash?: string;
}

export interface LoanHistoryEntry {
  id: string;
  timestamp: Date;
  type: LoanEventType;
  description: string;
  data: Record<string, unknown>;
  txHash?: string;
}

export type LoanEventType =
  | 'created'
  | 'approved'
  | 'disbursed'
  | 'collateral_added'
  | 'collateral_removed'
  | 'collateral_liquidated'
  | 'payment_made'
  | 'interest_accrued'
  | 'margin_call_triggered'
  | 'margin_call_resolved'
  | 'refinanced'
  | 'extended'
  | 'closed'
  | 'defaulted'
  | 'ai_decision';

export interface LoanAlert {
  id: string;
  type: LoanAlertType;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  actionRequired?: string;
}

export type LoanAlertType =
  | 'margin_warning'
  | 'margin_critical'
  | 'liquidation_risk'
  | 'payment_due'
  | 'payment_overdue'
  | 'rate_change'
  | 'collateral_value_drop'
  | 'refinance_opportunity'
  | 'health_factor_low';

export interface AILoanDecision {
  id: string;
  timestamp: Date;
  type: AIDecisionType;
  recommendation: string;
  confidence: number;
  reasoning: string[];
  factors: AIDecisionFactor[];
  action?: AIAction;
  outcome?: AIDecisionOutcome;
}

export type AIDecisionType =
  | 'borrow_recommendation'
  | 'repayment_timing'
  | 'collateral_adjustment'
  | 'refinance_suggestion'
  | 'risk_alert'
  | 'strategy_optimization';

export interface AIDecisionFactor {
  name: string;
  value: number | string;
  weight: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface AIAction {
  type: string;
  parameters: Record<string, unknown>;
  executedAt?: Date;
  result?: Record<string, unknown>;
  error?: string;
}

export interface AIDecisionOutcome {
  successful: boolean;
  actualResult: string;
  expectedResult: string;
  feedback: string;
}

// ============================================================================
// Credit Score Types
// ============================================================================

export interface CreditScore {
  userId: string;
  score: number; // 0-1000
  grade: CreditGrade;
  factors: CreditScoreFactor[];
  history: CreditScoreHistoryEntry[];
  breakdown: CreditScoreBreakdown;
  recommendations: CreditRecommendation[];
  eligibility: CreditEligibility;
  lastUpdated: Date;
  nextUpdate: Date;
}

export type CreditGrade = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' | 'CC' | 'C' | 'D';

export interface CreditScoreFactor {
  name: string;
  category: CreditFactorCategory;
  score: number;
  maxScore: number;
  weight: number;
  trend: 'improving' | 'stable' | 'declining';
  details: string;
}

export type CreditFactorCategory =
  | 'wallet_activity'
  | 'defi_history'
  | 'repayment_history'
  | 'collateral_quality'
  | 'portfolio_stability'
  | 'account_age'
  | 'behavioral_patterns'
  | 'external_signals';

export interface CreditScoreHistoryEntry {
  timestamp: Date;
  score: number;
  grade: CreditGrade;
  changeReason?: string;
}

export interface CreditScoreBreakdown {
  walletActivity: WalletActivityScore;
  defiHistory: DeFiHistoryScore;
  repaymentHistory: RepaymentHistoryScore;
  collateralQuality: CollateralQualityScore;
  portfolioStability: PortfolioStabilityScore;
  behavioralPatterns: BehavioralPatternsScore;
}

export interface WalletActivityScore {
  score: number;
  transactionCount: number;
  avgTransactionValue: string;
  uniqueProtocols: number;
  activityFrequency: string;
}

export interface DeFiHistoryScore {
  score: number;
  protocolsUsed: string[];
  tvlHistory: string;
  liquidityProvided: string;
  yieldEarned: string;
  positionsDuration: string;
}

export interface RepaymentHistoryScore {
  score: number;
  totalLoans: number;
  repaidOnTime: number;
  latePayments: number;
  defaults: number;
  avgRepaymentTime: string;
}

export interface CollateralQualityScore {
  score: number;
  assetDiversity: number;
  stablecoinRatio: number;
  blueChipRatio: number;
  volatilityScore: number;
}

export interface PortfolioStabilityScore {
  score: number;
  volatility30d: number;
  maxDrawdown: number;
  consistencyScore: number;
  riskAdjustedReturn: number;
}

export interface BehavioralPatternsScore {
  score: number;
  panicSellRisk: number;
  fomoBuyRisk: number;
  consistencyScore: number;
  decisionQuality: number;
}

export interface CreditRecommendation {
  id: string;
  type: 'improvement' | 'opportunity' | 'warning';
  title: string;
  description: string;
  impact: number; // Potential score improvement
  difficulty: 'easy' | 'medium' | 'hard';
  actionable: boolean;
  action?: string;
}

export interface CreditEligibility {
  canBorrow: boolean;
  maxBorrowAmount: string;
  availableProviders: LendingProvider[];
  bestRateAvailable: number;
  restrictions?: string[];
  requirements?: string[];
}

// ============================================================================
// Collateral Management Types
// ============================================================================

export interface CollateralPosition {
  id: string;
  userId: string;
  loanId: string;
  status: CollateralStatus;
  assets: ManagedCollateralAsset[];
  totalValue: string;
  totalValueUSD: string;
  healthFactor: number;
  monitoring: CollateralMonitoring;
  hedging?: CollateralHedging;
  automation: CollateralAutomation;
  history: CollateralHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export type CollateralStatus =
  | 'healthy'
  | 'warning'
  | 'critical'
  | 'liquidating'
  | 'liquidated';

export interface ManagedCollateralAsset {
  id: string;
  symbol: string;
  name: string;
  amount: string;
  valueUSD: string;
  priceUSD: string;
  weight: number;
  volatility24h: number;
  volatility7d: number;
  priceChange24h: number;
  riskTier: 'low' | 'medium' | 'high';
  liquidationPrice?: string;
}

export interface CollateralMonitoring {
  enabled: boolean;
  lastCheck: Date;
  nextCheck: Date;
  checkInterval: number;
  alerts: CollateralMonitoringAlert[];
  metrics: CollateralMetrics;
}

export interface CollateralMonitoringAlert {
  id: string;
  type: CollateralAlertType;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  actionTaken?: string;
}

export type CollateralAlertType =
  | 'value_drop'
  | 'health_factor_low'
  | 'volatility_spike'
  | 'liquidation_risk'
  | 'concentration_risk'
  | 'price_oracle_issue'
  | 'top_up_required';

export interface CollateralMetrics {
  currentLTV: number;
  healthFactor: number;
  volatilityIndex: number;
  diversificationScore: number;
  liquidationDistance: number;
  valueAtRisk: string;
}

export interface CollateralHedging {
  enabled: boolean;
  strategy: HedgingStrategy;
  positions: HedgePosition[];
  totalCost: string;
  effectiveCoverage: number;
}

export interface HedgePosition {
  id: string;
  type: 'put_option' | 'short_future' | 'inverse_perpetual' | 'synthetic';
  asset: string;
  size: string;
  entryPrice: string;
  currentPrice: string;
  pnl: string;
  expiresAt?: Date;
}

export interface CollateralAutomation {
  autoTopUp: AutoTopUpConfig;
  autoRebalance: AutoRebalanceConfig;
  autoWithdraw: AutoWithdrawConfig;
}

export interface AutoTopUpConfig {
  enabled: boolean;
  triggerThreshold: number; // LTV threshold
  topUpAsset: string;
  topUpSource: string;
  maxTopUpAmount: string;
  minTopUpAmount: string;
}

export interface AutoRebalanceConfig {
  enabled: boolean;
  targetAllocation: CollateralAllocationTarget[];
  rebalanceThreshold: number;
  frequency: 'on_trigger' | 'daily' | 'weekly';
}

export interface CollateralAllocationTarget {
  asset: string;
  targetWeight: number;
  minWeight: number;
  maxWeight: number;
}

export interface AutoWithdrawConfig {
  enabled: boolean;
  withdrawThreshold: number; // Health factor above which to withdraw excess
  withdrawAsset: string;
  withdrawDestination: string;
}

export interface CollateralHistoryEntry {
  id: string;
  timestamp: Date;
  type: CollateralEventType;
  description: string;
  data: Record<string, unknown>;
  txHash?: string;
}

export type CollateralEventType =
  | 'deposited'
  | 'withdrawn'
  | 'topped_up'
  | 'rebalanced'
  | 'liquidated'
  | 'hedged'
  | 'hedge_closed'
  | 'alert_triggered'
  | 'alert_resolved';

// ============================================================================
// Underwriting Types
// ============================================================================

export interface UnderwritingAssessment {
  id: string;
  userId: string;
  requestedAmount: string;
  requestedAsset: string;
  collateralOffered: CollateralAsset[];
  assessment: RiskAssessment;
  creditAnalysis: CreditAnalysis;
  decision: UnderwritingDecision;
  aiAnalysis?: AIUnderwritingAnalysis;
  createdAt: Date;
  expiresAt: Date;
}

export interface RiskAssessment {
  overallRisk: RiskLevel;
  riskScore: number;
  factors: RiskFactor[];
  volatilityForecast: VolatilityForecast;
  liquidationProbability: number;
  expectedLoss: string;
  stressTestResults: StressTestResult[];
}

export type RiskLevel = 'minimal' | 'low' | 'moderate' | 'elevated' | 'high' | 'extreme';

export interface RiskFactor {
  name: string;
  category: string;
  severity: RiskLevel;
  impact: number;
  description: string;
  mitigationPossible: boolean;
  mitigation?: string;
}

export interface VolatilityForecast {
  timeHorizon: string;
  expectedVolatility: number;
  confidenceInterval: { low: number; high: number };
  volatilityRegime: 'low' | 'normal' | 'high' | 'extreme';
  forecastMethod: string;
}

export interface StressTestResult {
  scenario: string;
  description: string;
  priceMovement: number;
  resultingLTV: number;
  liquidationTriggered: boolean;
  loss: string;
}

export interface CreditAnalysis {
  creditScore: number;
  creditGrade: CreditGrade;
  borrowingCapacity: string;
  utilizationRate: number;
  recommendations: string[];
}

export interface UnderwritingDecision {
  approved: boolean;
  approvedAmount?: string;
  terms?: ApprovedTerms;
  conditions?: string[];
  declineReasons?: string[];
  validUntil: Date;
}

export interface ApprovedTerms {
  maxLTV: number;
  interestRate: number;
  collateralRequirements: CollateralRequirement[];
  covenants: LoanCovenant[];
}

export interface CollateralRequirement {
  minAmount: string;
  acceptedAssets: string[];
  minDiversification: number;
  maxConcentration: number;
}

export interface LoanCovenant {
  type: string;
  description: string;
  threshold: number;
  consequence: string;
}

export interface AIUnderwritingAnalysis {
  modelId: string;
  confidence: number;
  recommendation: 'approve' | 'approve_with_conditions' | 'decline' | 'review';
  reasoning: string[];
  riskFactors: AIRiskFactor[];
  comparableLoans: ComparableLoan[];
  processingTime: number;
}

export interface AIRiskFactor {
  factor: string;
  score: number;
  weight: number;
  assessment: string;
}

export interface ComparableLoan {
  id: string;
  similarity: number;
  outcome: 'repaid' | 'defaulted' | 'active';
  keyMetrics: Record<string, number>;
}

// ============================================================================
// Strategy Types
// ============================================================================

export interface LendingStrategy {
  id: string;
  userId: string;
  name: string;
  type: LendingStrategyType;
  status: StrategyStatus;
  config: StrategyConfig;
  positions: StrategyPosition[];
  performance: StrategyPerformance;
  risk: StrategyRisk;
  automation: StrategyAutomation;
  history: StrategyHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export type StrategyStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'stopped'
  | 'liquidating'
  | 'completed';

export interface StrategyConfig {
  targetAPY: number;
  maxLeverage: number;
  collateralAssets: string[];
  borrowAssets: string[];
  protocols: string[];
  rebalanceThreshold: number;
  stopLossThreshold: number;
  takeProfitThreshold?: number;
}

export interface StrategyPosition {
  id: string;
  type: 'collateral' | 'borrow' | 'yield' | 'hedge';
  protocol: string;
  asset: string;
  amount: string;
  valueUSD: string;
  apy: number;
  openedAt: Date;
}

export interface StrategyPerformance {
  totalDeposited: string;
  currentValue: string;
  pnl: string;
  pnlPercent: number;
  apy: number;
  apyNet: number;
  fees: string;
  period: string;
}

export interface StrategyRisk {
  currentLeverage: number;
  maxDrawdown: number;
  liquidationRisk: number;
  correlationRisk: number;
  protocolRisk: number;
}

export interface StrategyAutomation {
  enabled: boolean;
  rebalanceEnabled: boolean;
  compoundEnabled: boolean;
  harvestEnabled: boolean;
  stopLossEnabled: boolean;
  aiOptimizationEnabled: boolean;
}

export interface StrategyHistoryEntry {
  id: string;
  timestamp: Date;
  type: StrategyEventType;
  description: string;
  data: Record<string, unknown>;
}

export type StrategyEventType =
  | 'created'
  | 'started'
  | 'paused'
  | 'stopped'
  | 'position_opened'
  | 'position_closed'
  | 'rebalanced'
  | 'harvested'
  | 'stop_loss_triggered'
  | 'optimized';

// ============================================================================
// Provider Integration Types
// ============================================================================

export interface CoinRabbitLoan {
  id: string;
  status: CoinRabbitLoanStatus;
  collateral: {
    coin: string;
    amount: string;
    usdValue: string;
  };
  loan: {
    coin: string;
    amount: string;
    usdValue: string;
  };
  ltv: number;
  interestRate: number;
  interestAccrued: string;
  liquidationPrice: string;
  createdAt: Date;
  expiresAt?: Date;
}

export type CoinRabbitLoanStatus =
  | 'pending'
  | 'active'
  | 'margin_call'
  | 'liquidating'
  | 'closed'
  | 'cancelled';

export interface CoinRabbitQuote {
  id: string;
  collateralCoin: string;
  collateralAmount: string;
  loanCoin: string;
  loanAmount: string;
  ltv: number;
  interestRate: number;
  liquidationPrice: string;
  validUntil: Date;
}

export interface CoinRabbitPaymentAddress {
  address: string;
  coin: string;
  network: string;
  memo?: string;
  expiresAt: Date;
}

// ============================================================================
// Event Types
// ============================================================================

export interface AICreditEvent {
  id: string;
  timestamp: Date;
  type: AICreditEventType;
  category: AICreditEventCategory;
  userId?: string;
  loanId?: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export type AICreditEventType =
  // Loan events
  | 'loan_requested'
  | 'loan_approved'
  | 'loan_disbursed'
  | 'loan_repayment'
  | 'loan_closed'
  | 'loan_defaulted'
  // Collateral events
  | 'collateral_deposited'
  | 'collateral_withdrawn'
  | 'collateral_topped_up'
  | 'collateral_liquidated'
  // Risk events
  | 'margin_call_triggered'
  | 'margin_call_resolved'
  | 'liquidation_triggered'
  | 'health_factor_low'
  // Credit events
  | 'credit_score_updated'
  | 'credit_grade_changed'
  | 'eligibility_changed'
  // AI events
  | 'ai_decision_made'
  | 'ai_recommendation'
  | 'ai_action_executed'
  // Strategy events
  | 'strategy_created'
  | 'strategy_started'
  | 'strategy_stopped'
  | 'strategy_rebalanced'
  // System events
  | 'provider_connected'
  | 'provider_disconnected'
  | 'config_updated'
  | 'alert_triggered';

export type AICreditEventCategory =
  | 'loan'
  | 'collateral'
  | 'risk'
  | 'credit'
  | 'ai'
  | 'strategy'
  | 'system';

export type AICreditEventCallback = (event: AICreditEvent) => void;

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CreateLoanRequest {
  provider?: LendingProvider;
  collateralAssets: Array<{
    symbol: string;
    amount: string;
  }>;
  borrowAsset: string;
  borrowAmount: string;
  ltv?: number;
  terms?: Partial<LoanTerms>;
  autonomousManagement?: boolean;
}

export interface RepayLoanRequest {
  loanId: string;
  amount: string;
  asset?: string;
  paymentType: 'principal' | 'interest' | 'full' | 'partial';
}

export interface AddCollateralRequest {
  loanId: string;
  asset: string;
  amount: string;
}

export interface WithdrawCollateralRequest {
  loanId: string;
  asset: string;
  amount: string;
}

export interface RefinanceLoanRequest {
  loanId: string;
  newProvider?: LendingProvider;
  newTerms?: Partial<LoanTerms>;
}

export interface GetQuoteRequest {
  provider?: LendingProvider;
  collateralAsset: string;
  collateralAmount: string;
  borrowAsset: string;
  borrowAmount?: string;
  ltv?: number;
}

export interface QuoteResponse {
  provider: LendingProvider;
  collateral: {
    asset: string;
    amount: string;
    valueUSD: string;
  };
  loan: {
    asset: string;
    amount: string;
    valueUSD: string;
  };
  ltv: number;
  interestRate: number;
  liquidationPrice: string;
  fees: LoanFees;
  validUntil: Date;
}

export interface CreateStrategyRequest {
  name: string;
  type: LendingStrategyType;
  config: StrategyConfig;
  initialDeposit?: string;
  automation?: Partial<StrategyAutomation>;
}

export interface UpdateCreditScoreRequest {
  userId: string;
  forceUpdate?: boolean;
}

export interface UnderwritingRequest {
  requestedAmount: string;
  requestedAsset: string;
  collateral: Array<{
    asset: string;
    amount: string;
  }>;
  purpose?: string;
  repaymentPlan?: string;
}
