/**
 * TONAIAgent - Autonomous Hedge Fund Type Definitions
 *
 * Core types for the autonomous hedge fund architecture, enabling AI-native
 * asset management with multi-agent coordination, portfolio optimization,
 * and institutional-grade risk management.
 */

// ============================================================================
// Fund Configuration Types
// ============================================================================

export type FundType =
  | 'autonomous'
  | 'hybrid'
  | 'managed'
  | 'dao_treasury'
  | 'family_office';

export type FundStatus =
  | 'initializing'
  | 'active'
  | 'paused'
  | 'liquidating'
  | 'closed';

export interface FundConfig {
  id: string;
  name: string;
  type: FundType;
  status: FundStatus;
  description?: string;

  // Capital configuration
  capital: CapitalConfig;

  // Agent configurations
  agents: AgentConfigurations;

  // Strategy allocation
  strategyAllocation: StrategyAllocation;

  // Risk parameters
  riskConfig: FundRiskConfig;

  // Fee structure
  fees: FeeStructure;

  // Governance settings
  governance: GovernanceConfig;

  // Compliance integration
  complianceEnabled: boolean;
  complianceAccountId?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;

  metadata: Record<string, unknown>;
}

export interface CapitalConfig {
  initialCapital: number;
  currentAUM: number;
  currency: string;
  minInvestment: number;
  maxCapacity?: number;
  lockupPeriodDays: number;
  redemptionNoticeDays: number;
}

export interface FeeStructure {
  managementFeePercent: number; // Annual management fee
  performanceFeePercent: number; // Performance fee on profits
  highWaterMark: boolean;
  hurdleRate?: number; // Minimum return before performance fee
}

export interface GovernanceConfig {
  type: 'centralized' | 'dao' | 'multi_sig';
  proposalThreshold?: number;
  votingPeriodDays?: number;
  quorumPercent?: number;
  emergencyMultiSig?: string[];
}

export interface FundRiskConfig {
  enabled: boolean;
  maxDrawdown: number;
  maxDailyLoss: number;
  maxLeverage: number;
  maxConcentration: number;
  emergencyStopEnabled: boolean;
}

// ============================================================================
// Agent Types
// ============================================================================

export type AgentRole =
  | 'portfolio'
  | 'execution'
  | 'risk'
  | 'data'
  | 'strategy'
  | 'research'
  | 'compliance'
  | 'governance';

export type AgentStatus =
  | 'idle'
  | 'active'
  | 'processing'
  | 'paused'
  | 'error';

export interface HedgeFundAgent {
  id: string;
  role: AgentRole;
  status: AgentStatus;
  config: AgentConfig;
  metrics: AgentMetrics;
  lastActive: Date;
  createdAt: Date;
}

export interface AgentConfig {
  enabled: boolean;
  priority: number;
  maxConcurrentTasks: number;
  timeoutMs: number;
  retryPolicy: RetryPolicy;
  parameters: Record<string, unknown>;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface AgentMetrics {
  tasksCompleted: number;
  tasksFailed: number;
  averageLatencyMs: number;
  lastError?: string;
  uptime: number; // percentage
}

export interface AgentConfigurations {
  portfolio: PortfolioAgentConfig;
  execution: ExecutionAgentConfig;
  risk: RiskAgentConfig;
  data: DataAgentConfig;
  strategy: StrategyAgentConfig;
  research: ResearchAgentConfig;
  compliance: ComplianceAgentConfig;
  governance: GovernanceAgentConfig;
}

// ============================================================================
// Portfolio Agent Types
// ============================================================================

export interface PortfolioAgentConfig {
  enabled: boolean;
  targetAllocation: Record<string, number>; // strategy -> percentage
  rebalanceThreshold: number; // Drift percentage to trigger rebalance
  rebalanceFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  constraints: PortfolioConstraints;
  optimizationMethod: 'mean_variance' | 'risk_parity' | 'black_litterman' | 'equal_weight';
  parameters: Record<string, unknown>;
}

export interface PortfolioConstraints {
  maxSingleAsset: number; // Max allocation to single asset
  maxSingleStrategy: number; // Max allocation to single strategy
  maxCorrelation: number; // Max correlation between positions
  minLiquidity: number; // Min liquid asset percentage
  maxLeverage: number;
  longOnly: boolean;
}

export interface PortfolioState {
  totalValue: number;
  cash: number;
  positions: PortfolioPosition[];
  allocation: Record<string, number>; // asset/strategy -> current percentage
  performance: PortfolioPerformance;
  lastRebalance?: Date;
  nextRebalance?: Date;
}

export interface PortfolioPosition {
  id: string;
  asset: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  weight: number; // Portfolio weight
  strategy?: string;
  openedAt: Date;
  metadata: Record<string, unknown>;
}

export interface PortfolioPerformance {
  totalReturn: number;
  totalReturnPercent: number;
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
  yearToDateReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
  winRate: number;
  profitFactor: number;
}

export interface RebalanceOrder {
  id: string;
  asset: string;
  side: 'buy' | 'sell';
  quantity: number;
  estimatedValue: number;
  currentWeight: number;
  targetWeight: number;
  priority: number;
  reason: string;
}

// ============================================================================
// Execution Agent Types
// ============================================================================

export interface ExecutionAgentConfig {
  enabled: boolean;
  executionMode: 'fast' | 'optimal' | 'stealth';
  slippageTolerance: number;
  gasStrategy: 'fast' | 'standard' | 'dynamic';
  mevProtection: boolean;
  preferredDexes: string[];
  splitThreshold: number; // Amount above which to split orders
  twapDuration?: number; // TWAP duration in seconds
  parameters: Record<string, unknown>;
}

export interface ExecutionOrder {
  id: string;
  fundId: string;
  type: OrderType;
  side: 'buy' | 'sell';
  asset: string;
  quantity: number;
  price?: number; // For limit orders
  status: OrderStatus;
  executionStrategy: ExecutionStrategy;
  slippageTolerance: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  fills: OrderFill[];
  totalFilled: number;
  averagePrice: number;
  fees: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata: Record<string, unknown>;
}

export type OrderType = 'market' | 'limit' | 'twap' | 'vwap' | 'iceberg';
export type OrderStatus = 'pending' | 'open' | 'partial' | 'filled' | 'cancelled' | 'failed';
export type ExecutionStrategy = 'immediate' | 'twap' | 'vwap' | 'smart_routing' | 'dark_pool';

export interface OrderFill {
  id: string;
  orderId: string;
  quantity: number;
  price: number;
  fee: number;
  dex: string;
  txHash: string;
  timestamp: Date;
}

// ============================================================================
// Risk Agent Types
// ============================================================================

export interface RiskAgentConfig {
  enabled: boolean;
  varConfig: VaRConfig;
  limits: RiskLimits;
  stressTestConfig: StressTestConfig;
  hedgingConfig: HedgingConfig;
  alertConfig: AlertConfig;
  parameters: Record<string, unknown>;
}

export interface VaRConfig {
  confidenceLevel: number; // e.g., 0.95 or 0.99
  timeHorizon: number; // Days
  method: 'historical' | 'parametric' | 'monte_carlo';
  lookbackPeriod: number; // Days
  simulations?: number; // For Monte Carlo
}

export interface RiskLimits {
  maxDrawdown: number;
  maxDailyLoss: number;
  maxWeeklyLoss: number;
  maxLeverage: number;
  maxConcentration: number;
  maxVaR: number;
  minLiquidity: number;
}

export interface StressTestConfig {
  enabled: boolean;
  scenarios: string[];
  frequency: 'daily' | 'weekly' | 'monthly';
  customScenarios?: StressScenario[];
}

export interface StressScenario {
  id: string;
  name: string;
  description: string;
  marketMove: number; // Percentage change
  volatilitySpike: number; // Multiplier
  correlationBreakdown: boolean;
  liquidityCrisis: boolean;
  duration?: number; // Days
}

export interface StressTestResult {
  scenarioId: string;
  scenarioName: string;
  timestamp: Date;
  portfolioLoss: number;
  portfolioLossPercent: number;
  worstAsset: string;
  worstAssetLoss: number;
  positionImpacts: PositionImpact[];
  riskMetrics: RiskMetricsSnapshot;
  recommendations: string[];
}

export interface PositionImpact {
  asset: string;
  currentValue: number;
  stressedValue: number;
  loss: number;
  lossPercent: number;
}

export interface HedgingConfig {
  enabled: boolean;
  strategies: HedgingStrategy[];
  rehedgeFrequency: 'hourly' | 'daily' | 'on_trigger';
  maxHedgeCost: number; // Max percentage of portfolio for hedging
}

export interface HedgingStrategy {
  id: string;
  type: 'delta' | 'gamma' | 'vega' | 'tail';
  trigger: HedgingTrigger;
  instruments: string[];
  targetExposure: number;
}

export interface HedgingTrigger {
  metric: 'var' | 'beta' | 'correlation' | 'volatility' | 'drawdown';
  threshold: number;
  operator: 'above' | 'below';
}

export interface AlertConfig {
  varBreachPercent: number; // Alert when VaR reaches X% of limit
  drawdownWarning: number;
  concentrationWarning: number;
  channels: ('email' | 'telegram' | 'webhook')[];
}

export interface RiskMetricsSnapshot {
  timestamp: Date;
  var95: number;
  var99: number;
  cvar: number; // Conditional VaR (Expected Shortfall)
  beta: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  currentDrawdown: number;
  leverage: number;
  concentration: number; // Largest position weight
  liquidity: number; // Liquid asset percentage
}

export interface RiskAlert {
  id: string;
  fundId: string;
  type: RiskAlertType;
  severity: 'info' | 'warning' | 'critical';
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

export type RiskAlertType =
  | 'var_breach'
  | 'drawdown_warning'
  | 'drawdown_limit'
  | 'concentration_warning'
  | 'leverage_warning'
  | 'liquidity_warning'
  | 'correlation_spike'
  | 'volatility_spike'
  | 'anomaly_detected';

// ============================================================================
// Data Agent Types
// ============================================================================

export interface DataAgentConfig {
  enabled: boolean;
  dataSources: DataSource[];
  updateFrequencyMs: number;
  anomalyDetection: boolean;
  signalGeneration: SignalGenerationConfig;
  parameters: Record<string, unknown>;
}

export interface DataSource {
  id: string;
  type: 'price' | 'onchain' | 'sentiment' | 'orderbook' | 'fundamental';
  provider: string;
  assets?: string[];
  metrics?: string[];
  enabled: boolean;
  priority: number;
}

export interface SignalGenerationConfig {
  enabled: boolean;
  minConfidence: number;
  signalTypes: SignalType[];
  cooldownMs: number;
}

export type SignalType =
  | 'technical'
  | 'momentum'
  | 'mean_reversion'
  | 'sentiment'
  | 'onchain'
  | 'fundamental';

export interface MarketSignal {
  id: string;
  type: SignalType;
  asset: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-1
  confidence: number; // 0-1
  timeframe: string;
  indicators: SignalIndicator[];
  generatedAt: Date;
  expiresAt: Date;
  metadata: Record<string, unknown>;
}

export interface SignalIndicator {
  name: string;
  value: number;
  signal: 'buy' | 'sell' | 'hold';
  weight: number;
}

export interface MarketData {
  asset: string;
  timestamp: Date;
  price: number;
  volume24h: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  marketCap?: number;
  source: string;
}

// ============================================================================
// Strategy Agent Types
// ============================================================================

export interface StrategyAgentConfig {
  enabled: boolean;
  strategyTypes: StrategyType[];
  optimization: OptimizationConfig;
  backtesting: BacktestConfig;
  liveAdaptation: LiveAdaptationConfig;
  parameters: Record<string, unknown>;
}

export type StrategyType =
  | 'delta_neutral'
  | 'trend_following'
  | 'mean_reversion'
  | 'arbitrage'
  | 'yield_farming'
  | 'liquidity_provision'
  | 'momentum'
  | 'statistical_arbitrage';

export interface OptimizationConfig {
  method: 'grid_search' | 'bayesian' | 'genetic' | 'random';
  frequency: 'daily' | 'weekly' | 'monthly';
  lookbackPeriod: number; // Days
  targetMetric: 'sharpe' | 'sortino' | 'returns' | 'calmar';
}

export interface BacktestConfig {
  enabled: boolean;
  minSharpe: number;
  maxDrawdown: number;
  minWinRate: number;
  lookbackPeriod: number; // Days
}

export interface LiveAdaptationConfig {
  enabled: boolean;
  learningRate: number;
  adaptationFrequency: 'hourly' | 'daily' | 'weekly';
  minDataPoints: number;
  confidenceThreshold: number;
  rollbackEnabled: boolean;
}

export interface StrategyAllocation {
  allocations: StrategyAllocationItem[];
  rebalanceThreshold: number;
  lastRebalance?: Date;
}

export interface StrategyAllocationItem {
  strategyType: StrategyType;
  targetPercent: number;
  currentPercent: number;
  minPercent: number;
  maxPercent: number;
  enabled: boolean;
}

export interface StrategyPerformance {
  strategyType: StrategyType;
  totalReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  tradesCount: number;
  avgTradeReturn: number;
  period: string;
}

// ============================================================================
// Research Agent Types
// ============================================================================

export interface ResearchAgentConfig {
  enabled: boolean;
  researchTypes: ResearchType[];
  sources: string[];
  updateFrequency: 'hourly' | 'daily' | 'weekly';
  parameters: Record<string, unknown>;
}

export type ResearchType =
  | 'market_regime'
  | 'protocol_analysis'
  | 'yield_opportunities'
  | 'risk_factors'
  | 'correlation_analysis'
  | 'sentiment_analysis';

export interface ResearchReport {
  id: string;
  type: ResearchType;
  title: string;
  summary: string;
  findings: ResearchFinding[];
  recommendations: ResearchRecommendation[];
  confidence: number;
  generatedAt: Date;
  validUntil: Date;
  metadata: Record<string, unknown>;
}

export interface ResearchFinding {
  id: string;
  category: string;
  description: string;
  evidence: string[];
  impact: 'high' | 'medium' | 'low';
  confidence: number;
}

export interface ResearchRecommendation {
  id: string;
  action: string;
  rationale: string;
  expectedImpact: string;
  priority: 'high' | 'medium' | 'low';
  timeframe: string;
}

// ============================================================================
// Compliance Agent Types
// ============================================================================

export interface ComplianceAgentConfig {
  enabled: boolean;
  kycAmlEnabled: boolean;
  transactionMonitoring: boolean;
  reportingEnabled: boolean;
  auditTrailEnabled: boolean;
  sanctionsScreening: boolean;
  parameters: Record<string, unknown>;
}

// ============================================================================
// Governance Agent Types
// ============================================================================

export interface GovernanceAgentConfig {
  enabled: boolean;
  proposalCreation: boolean;
  votingEnabled: boolean;
  parameterOptimization: boolean;
  emergencyControls: boolean;
  parameters: Record<string, unknown>;
}

export interface GovernanceProposal {
  id: string;
  fundId: string;
  type: ProposalType;
  title: string;
  description: string;
  proposer: string;
  status: ProposalStatus;
  parameters: Record<string, unknown>;
  votesFor: number;
  votesAgainst: number;
  quorumReached: boolean;
  createdAt: Date;
  votingEndsAt: Date;
  executedAt?: Date;
  metadata: Record<string, unknown>;
}

export type ProposalType =
  | 'parameter_change'
  | 'strategy_update'
  | 'fee_adjustment'
  | 'emergency_action'
  | 'upgrade'
  | 'other';

export type ProposalStatus =
  | 'draft'
  | 'active'
  | 'passed'
  | 'rejected'
  | 'executed'
  | 'cancelled';

// ============================================================================
// AI Investment Framework Types
// ============================================================================

export interface AIInvestmentConfig {
  primaryProvider: AIProviderConfig;
  fallbackProviders: AIProviderConfig[];
  signalGeneration: AISignalConfig;
  predictionModels: PredictionModelConfig[];
  rlAgents: RLAgentConfig[];
  sentimentAnalysis: SentimentConfig;
}

export interface AIProviderConfig {
  provider: 'groq' | 'anthropic' | 'openai' | 'google' | 'xai' | 'openrouter';
  model: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
}

export interface AISignalConfig {
  enabled: boolean;
  indicators: string[];
  timeframes: string[];
  minConfidence: number;
  aggregationMethod: 'weighted' | 'voting' | 'ensemble';
}

export interface PredictionModelConfig {
  id: string;
  type: 'price' | 'volatility' | 'direction' | 'regime';
  model: 'lstm' | 'transformer' | 'ensemble' | 'xgboost';
  horizons: number[]; // Hours
  features: string[];
  enabled: boolean;
}

export interface RLAgentConfig {
  id: string;
  algorithm: 'dqn' | 'ppo' | 'a3c' | 'sac' | 'td3';
  environment: string;
  rewardFunction: string;
  state: 'training' | 'evaluation' | 'live';
  updateFrequency: 'hourly' | 'daily' | 'weekly';
  enabled: boolean;
}

export interface SentimentConfig {
  enabled: boolean;
  sources: ('twitter' | 'telegram' | 'news' | 'reddit')[];
  assets: string[];
  timeWindowHours: number;
  minMentions: number;
}

export interface AIPrediction {
  id: string;
  modelId: string;
  asset: string;
  type: 'price' | 'volatility' | 'direction' | 'regime';
  horizon: number; // Hours
  prediction: number | string;
  confidence: number;
  features: Record<string, number>;
  generatedAt: Date;
  expiresAt: Date;
}

export interface SentimentResult {
  asset: string;
  sentiment: number; // -1 to 1
  volume: number; // Mention count
  trending: boolean;
  keywords: string[];
  sources: SentimentSource[];
  timestamp: Date;
}

export interface SentimentSource {
  source: string;
  sentiment: number;
  mentions: number;
  engagement: number;
}

// ============================================================================
// Fund Performance Types
// ============================================================================

export interface FundPerformance {
  fundId: string;
  timestamp: Date;
  aum: number;
  nav: number; // Net Asset Value per unit
  totalReturn: number;
  returnSinceInception: number;
  returns: PerformanceReturns;
  riskMetrics: RiskMetricsSnapshot;
  strategyPerformance: StrategyPerformance[];
  topPositions: PortfolioPosition[];
  attribution: PerformanceAttribution;
}

export interface PerformanceReturns {
  daily: number;
  weekly: number;
  monthly: number;
  quarterly: number;
  yearToDate: number;
  oneYear?: number;
  sinceInception: number;
}

export interface PerformanceAttribution {
  byStrategy: Record<string, number>;
  byAsset: Record<string, number>;
  byFactor: Record<string, number>;
}

// ============================================================================
// Event Types
// ============================================================================

export interface HedgeFundEvent {
  id: string;
  fundId: string;
  type: HedgeFundEventType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export type HedgeFundEventType =
  | 'fund_started'
  | 'fund_paused'
  | 'fund_stopped'
  | 'rebalance_triggered'
  | 'rebalance_completed'
  | 'order_created'
  | 'order_filled'
  | 'order_failed'
  | 'signal_generated'
  | 'risk_alert'
  | 'risk_limit_breach'
  | 'stress_test_completed'
  | 'strategy_updated'
  | 'agent_error'
  | 'emergency_stop';

export type HedgeFundEventCallback = (event: HedgeFundEvent) => void;

// ============================================================================
// Investor Types
// ============================================================================

export interface FundInvestor {
  id: string;
  fundId: string;
  userId: string;
  accountId?: string; // Institutional account
  investmentAmount: number;
  currentValue: number;
  units: number; // Fund units/shares
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  investedAt: Date;
  lockupEndsAt?: Date;
  redemptionRequestedAt?: Date;
  metadata: Record<string, unknown>;
}

export interface InvestmentRequest {
  investorId: string;
  amount: number;
  currency: string;
}

export interface RedemptionRequest {
  id: string;
  investorId: string;
  fundId: string;
  amount: number;
  units?: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  requestedAt: Date;
  processAt: Date;
  completedAt?: Date;
}

// ============================================================================
// Transparency Types
// ============================================================================

export interface AIDecisionLog {
  id: string;
  fundId: string;
  agentRole: AgentRole;
  decisionType: string;
  timestamp: Date;
  input: DecisionInput;
  reasoning: DecisionReasoning;
  output: DecisionOutput;
  outcome?: DecisionOutcome;
  auditInfo: AuditInfo;
}

export interface DecisionInput {
  marketData: Record<string, unknown>;
  portfolioState: Record<string, unknown>;
  signals: MarketSignal[];
  context: Record<string, unknown>;
}

export interface DecisionReasoning {
  summary: string;
  factors: ReasoningFactor[];
  confidence: number;
  alternativesConsidered: Alternative[];
}

export interface ReasoningFactor {
  name: string;
  value: string | number;
  weight: number;
  direction: 'positive' | 'negative' | 'neutral';
}

export interface Alternative {
  action: string;
  reason: string;
  expectedOutcome: string;
}

export interface DecisionOutput {
  action: string;
  parameters: Record<string, unknown>;
  expectedOutcome: Record<string, unknown>;
  riskAssessment: Record<string, unknown>;
}

export interface DecisionOutcome {
  success: boolean;
  actualResult: Record<string, unknown>;
  pnl?: number;
  executionTime: number;
  notes?: string;
}

export interface AuditInfo {
  modelId: string;
  modelVersion: string;
  humanReviewRequired: boolean;
  humanReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  complianceChecks: string[];
}
