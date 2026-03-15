/**
 * TONAIAgent - Strategy Engine Type Definitions
 *
 * Core types for the autonomous strategy engine that enables AI agents
 * to create, execute, optimize, and evolve financial strategies on TON.
 */

// ============================================================================
// Strategy Core Types
// ============================================================================

export type StrategyStatus =
  | 'draft'
  | 'validating'
  | 'validated'
  | 'backtesting'
  | 'backtested'
  | 'active'
  | 'paused'
  | 'stopped'
  | 'archived'
  | 'error';

export type StrategyType =
  | 'rule_based'
  | 'ai_driven'
  | 'hybrid'
  | 'template_based';

export type StrategyRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  type: StrategyType;
  version: number;
  status: StrategyStatus;
  userId: string;
  agentId: string;

  // Strategy definition
  definition: StrategySpec;

  // Lifecycle management
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
  lastExecutedAt?: Date;
  validatedAt?: Date;

  // Performance tracking
  performance?: StrategyPerformance;

  // Metadata
  tags: string[];
  templateId?: string;
  parentStrategyId?: string;
  metadata: Record<string, unknown>;
}

export interface StrategySpec {
  // Triggers define when the strategy executes
  triggers: StrategyTrigger[];

  // Conditions that must be met for execution
  conditions: StrategyCondition[];

  // Actions to perform
  actions: StrategyAction[];

  // Risk controls
  riskControls: RiskControl[];

  // Configurable parameters
  parameters: StrategyParameter[];

  // Capital allocation settings
  capitalAllocation: CapitalAllocation;
}

// ============================================================================
// Trigger Types
// ============================================================================

export type TriggerType =
  | 'schedule'
  | 'price'
  | 'volume'
  | 'indicator'
  | 'event'
  | 'portfolio'
  | 'market'
  | 'custom';

export interface StrategyTrigger {
  id: string;
  type: TriggerType;
  name: string;
  description?: string;
  enabled: boolean;
  config: TriggerConfig;
  cooldownSeconds?: number;
  maxTriggersPerDay?: number;
}

export type TriggerConfig =
  | ScheduleTriggerConfig
  | PriceTriggerConfig
  | VolumeTriggerConfig
  | IndicatorTriggerConfig
  | EventTriggerConfig
  | PortfolioTriggerConfig
  | MarketTriggerConfig
  | CustomTriggerConfig;

export interface ScheduleTriggerConfig {
  type: 'schedule';
  cron: string;
  timezone?: string;
}

export interface PriceTriggerConfig {
  type: 'price';
  token: string;
  operator: ComparisonOperator;
  value: number;
  currency: 'USD' | 'TON';
}

export interface VolumeTriggerConfig {
  type: 'volume';
  token: string;
  operator: ComparisonOperator;
  value: number;
  timeframe: Timeframe;
}

export interface IndicatorTriggerConfig {
  type: 'indicator';
  indicator: TechnicalIndicator;
  token: string;
  operator: ComparisonOperator;
  value: number;
  timeframe: Timeframe;
}

export interface EventTriggerConfig {
  type: 'event';
  eventType: MarketEventType;
  tokens?: string[];
  protocols?: string[];
}

export interface PortfolioTriggerConfig {
  type: 'portfolio';
  metric: PortfolioMetric;
  operator: ComparisonOperator;
  value: number;
}

export interface MarketTriggerConfig {
  type: 'market';
  metric: MarketMetric;
  operator: ComparisonOperator;
  value: number;
  timeframe: Timeframe;
}

export interface CustomTriggerConfig {
  type: 'custom';
  expression: string;
  variables: Record<string, string>;
}

export type ComparisonOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'between'
  | 'crosses_above'
  | 'crosses_below';

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';

export type TechnicalIndicator =
  | 'sma'
  | 'ema'
  | 'rsi'
  | 'macd'
  | 'bollinger_bands'
  | 'atr'
  | 'vwap'
  | 'momentum'
  | 'stochastic';

export type MarketEventType =
  | 'large_trade'
  | 'liquidity_change'
  | 'new_listing'
  | 'governance_vote'
  | 'airdrop'
  | 'hack_alert'
  | 'whale_movement';

export type PortfolioMetric =
  | 'total_value'
  | 'token_balance'
  | 'token_percentage'
  | 'unrealized_pnl'
  | 'realized_pnl'
  | 'drawdown';

export type MarketMetric =
  | 'price_change'
  | 'volatility'
  | 'volume_change'
  | 'liquidity'
  | 'market_cap';

// ============================================================================
// Condition Types
// ============================================================================

export type ConditionOperator = 'and' | 'or';

export interface StrategyCondition {
  id: string;
  name: string;
  type: ConditionType;
  operator?: ConditionOperator;
  rules: ConditionRule[];
  required: boolean;
}

export type ConditionType =
  | 'market'
  | 'portfolio'
  | 'risk'
  | 'time'
  | 'custom';

export interface ConditionRule {
  id: string;
  field: string;
  operator: ComparisonOperator;
  value: number | string | boolean;
  valueType: 'static' | 'parameter' | 'reference';
}

// ============================================================================
// Action Types
// ============================================================================

export type ActionType =
  | 'swap'
  | 'transfer'
  | 'stake'
  | 'unstake'
  | 'provide_liquidity'
  | 'remove_liquidity'
  | 'rebalance'
  | 'notify'
  | 'pause_strategy'
  | 'custom';

export interface StrategyAction {
  id: string;
  type: ActionType;
  name: string;
  description?: string;
  priority: number;
  config: ActionConfig;
  retryConfig?: RetryConfig;
  fallbackActionId?: string;
}

export type ActionConfig =
  | SwapActionConfig
  | TransferActionConfig
  | StakeActionConfig
  | UnstakeActionConfig
  | LiquidityActionConfig
  | RebalanceActionConfig
  | NotifyActionConfig
  | CustomActionConfig;

export interface SwapActionConfig {
  type: 'swap';
  fromToken: string;
  toToken: string;
  amount: AmountSpec;
  slippageTolerance: number;
  preferredProtocol?: string;
  allowedProtocols?: string[];
}

export interface TransferActionConfig {
  type: 'transfer';
  token: string;
  amount: AmountSpec;
  destination: string;
  memo?: string;
}

export interface StakeActionConfig {
  type: 'stake';
  token: string;
  amount: AmountSpec;
  validator?: string;
  pool?: string;
  lockPeriod?: number;
}

export interface UnstakeActionConfig {
  type: 'unstake';
  token: string;
  amount: AmountSpec;
  validator?: string;
  pool?: string;
}

export interface LiquidityActionConfig {
  type: 'provide_liquidity' | 'remove_liquidity';
  protocol: string;
  pool: string;
  tokenA: string;
  tokenB: string;
  amountA?: AmountSpec;
  amountB?: AmountSpec;
  percentage?: number;
}

export interface RebalanceActionConfig {
  type: 'rebalance';
  targetAllocations: TokenAllocation[];
  tolerance: number;
  maxSlippage: number;
  preferredProtocol?: string;
}

export interface NotifyActionConfig {
  type: 'notify';
  channel: 'telegram' | 'email' | 'webhook';
  message: string;
  data?: Record<string, unknown>;
}

export interface CustomActionConfig {
  type: 'custom';
  handler: string;
  params: Record<string, unknown>;
}

export interface AmountSpec {
  type: 'fixed' | 'percentage' | 'parameter' | 'remaining';
  value: number | string;
  max?: number;
  min?: number;
}

export interface TokenAllocation {
  token: string;
  targetPercentage: number;
}

export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

// ============================================================================
// Risk Control Types
// ============================================================================

export type RiskControlType =
  | 'stop_loss'
  | 'take_profit'
  | 'trailing_stop'
  | 'max_position'
  | 'max_drawdown'
  | 'daily_limit'
  | 'velocity_limit'
  | 'exposure_limit';

export interface RiskControl {
  id: string;
  type: RiskControlType;
  name: string;
  enabled: boolean;
  config: RiskControlConfig;
  action: RiskControlAction;
}

export type RiskControlConfig =
  | StopLossConfig
  | TakeProfitConfig
  | TrailingStopConfig
  | MaxPositionConfig
  | MaxDrawdownConfig
  | DailyLimitConfig
  | VelocityLimitConfig
  | ExposureLimitConfig;

export interface StopLossConfig {
  type: 'stop_loss';
  percentage: number;
  token?: string;
}

export interface TakeProfitConfig {
  type: 'take_profit';
  percentage: number;
  token?: string;
  sellPercentage?: number;
}

export interface TrailingStopConfig {
  type: 'trailing_stop';
  percentage: number;
  token?: string;
  activationPercentage?: number;
}

export interface MaxPositionConfig {
  type: 'max_position';
  token: string;
  maxPercentage: number;
  maxAbsolute?: number;
}

export interface MaxDrawdownConfig {
  type: 'max_drawdown';
  maxPercentage: number;
  timeframe: Timeframe;
}

export interface DailyLimitConfig {
  type: 'daily_limit';
  maxTransactions: number;
  maxVolume: number;
}

export interface VelocityLimitConfig {
  type: 'velocity_limit';
  maxTransactionsPerHour: number;
  maxVolumePerHour: number;
}

export interface ExposureLimitConfig {
  type: 'exposure_limit';
  maxSingleTokenExposure: number;
  maxProtocolExposure: number;
}

export interface RiskControlAction {
  type: 'notify' | 'pause' | 'reduce' | 'close';
  sellPercentage?: number;
  notifyChannels?: string[];
}

// ============================================================================
// Parameter Types
// ============================================================================

export type ParameterType = 'number' | 'string' | 'boolean' | 'token' | 'protocol' | 'address';

export interface StrategyParameter {
  id: string;
  name: string;
  description?: string;
  type: ParameterType;
  value: number | string | boolean;
  defaultValue: number | string | boolean;
  constraints?: ParameterConstraints;
  optimizable: boolean;
}

export interface ParameterConstraints {
  min?: number;
  max?: number;
  step?: number;
  options?: (string | number)[];
  pattern?: string;
}

// ============================================================================
// Capital Allocation Types
// ============================================================================

export interface CapitalAllocation {
  mode: 'fixed' | 'percentage' | 'dynamic';
  allocatedAmount?: number;
  allocatedPercentage?: number;
  minCapital: number;
  maxCapital?: number;
  reservePercentage: number;
}

// ============================================================================
// Performance Types
// ============================================================================

export interface StrategyPerformance {
  strategyId: string;
  period: PerformancePeriod;
  metrics: PerformanceMetrics;
  trades: TradeStatistics;
  riskMetrics: RiskMetrics;
  comparison: BenchmarkComparison;
  lastUpdated: Date;
}

export interface PerformancePeriod {
  start: Date;
  end: Date;
  type: 'daily' | 'weekly' | 'monthly' | 'all_time';
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  absoluteProfit: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  currentDrawdown: number;
}

export interface TradeStatistics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  expectancy: number;
  averageHoldingTime: number;
  avgSlippage: number;
  totalFees: number;
}

export interface RiskMetrics {
  volatility: number;
  var95: number;
  cvar95: number;
  beta: number;
  correlation: number;
  informationRatio: number;
}

export interface BenchmarkComparison {
  vsTon: number;
  vsBtc: number;
  vsHodl: number;
  vsBenchmark: number;
  benchmarkName: string;
}

// ============================================================================
// Execution Types
// ============================================================================

export type ExecutionStatus =
  | 'pending'
  | 'queued'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'partially_completed';

export interface StrategyExecution {
  id: string;
  strategyId: string;
  triggerId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  triggerContext: TriggerContext;
  conditionResults: ConditionResult[];
  actionResults: ActionResult[];
  error?: ExecutionError;
  metadata: Record<string, unknown>;
}

export interface TriggerContext {
  type: TriggerType;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface ConditionResult {
  conditionId: string;
  passed: boolean;
  evaluatedRules: RuleResult[];
  evaluatedAt: Date;
}

export interface RuleResult {
  ruleId: string;
  passed: boolean;
  actualValue: unknown;
  expectedValue: unknown;
}

export interface ActionResult {
  actionId: string;
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  transactionIds?: string[];
  result?: Record<string, unknown>;
  error?: ExecutionError;
  retryCount: number;
}

export interface ExecutionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
}

// ============================================================================
// Backtest Types
// ============================================================================

export type BacktestStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface BacktestConfig {
  strategyId: string;
  period: {
    start: Date;
    end: Date;
  };
  initialCapital: number;
  slippageModel: SlippageModel;
  feeModel: FeeModel;
  dataGranularity: Timeframe;
  monteCarlo?: MonteCarloConfig;
}

export interface SlippageModel {
  type: 'fixed' | 'dynamic' | 'volume_based';
  baseSlippage: number;
  volumeImpactFactor?: number;
}

export interface FeeModel {
  tradingFee: number;
  gasCost: number;
  protocolFee?: number;
}

export interface MonteCarloConfig {
  enabled: boolean;
  simulations: number;
  confidenceLevel: number;
}

export interface BacktestResult {
  id: string;
  strategyId: string;
  config: BacktestConfig;
  status: BacktestStatus;
  startedAt: Date;
  completedAt?: Date;
  performance: StrategyPerformance;
  equityCurve: EquityPoint[];
  trades: SimulatedTrade[];
  monteCarlo?: MonteCarloResult;
  warnings: BacktestWarning[];
  error?: ExecutionError;
}

export interface EquityPoint {
  timestamp: Date;
  equity: number;
  drawdown: number;
  positions: Record<string, number>;
}

export interface SimulatedTrade {
  id: string;
  timestamp: Date;
  type: 'buy' | 'sell';
  token: string;
  amount: number;
  price: number;
  value: number;
  fees: number;
  slippage: number;
  pnl?: number;
}

export interface MonteCarloResult {
  simulations: number;
  expectedReturn: number;
  var95: number;
  cvar95: number;
  worstCase: number;
  bestCase: number;
  distribution: number[];
}

export interface BacktestWarning {
  type: 'data_gap' | 'low_liquidity' | 'slippage_assumption' | 'look_ahead_bias';
  message: string;
  timestamp?: Date;
}

// ============================================================================
// Optimization Types
// ============================================================================

export type OptimizationMethod =
  | 'grid_search'
  | 'random_search'
  | 'bayesian'
  | 'genetic'
  | 'reinforcement_learning';

export type OptimizationObjective =
  | 'max_return'
  | 'max_sharpe'
  | 'max_sortino'
  | 'min_drawdown'
  | 'custom';

export interface OptimizationConfig {
  strategyId: string;
  method: OptimizationMethod;
  objective: OptimizationObjective;
  customObjective?: string;
  parameters: OptimizableParameter[];
  constraints: OptimizationConstraints;
  backtestConfig: BacktestConfig;
  maxIterations: number;
  convergenceThreshold?: number;
}

export interface OptimizableParameter {
  parameterId: string;
  range: [number, number];
  step?: number;
  scale?: 'linear' | 'log';
}

export interface OptimizationConstraints {
  maxDrawdown?: number;
  minSharpe?: number;
  minWinRate?: number;
  maxTradesPerDay?: number;
}

export interface OptimizationResult {
  id: string;
  strategyId: string;
  config: OptimizationConfig;
  status: BacktestStatus;
  startedAt: Date;
  completedAt?: Date;
  iterations: number;
  bestParameters: Record<string, number>;
  bestPerformance: StrategyPerformance;
  convergenceCurve: ConvergencePoint[];
  parameterSensitivity: ParameterSensitivity[];
  recommendations: OptimizationRecommendation[];
}

export interface ConvergencePoint {
  iteration: number;
  objectiveValue: number;
  parameters: Record<string, number>;
}

export interface ParameterSensitivity {
  parameterId: string;
  importance: number;
  optimalRange: [number, number];
  robustness: number;
}

export interface OptimizationRecommendation {
  type: 'parameter_change' | 'risk_adjustment' | 'structure_change';
  description: string;
  impact: number;
  confidence: number;
}

// ============================================================================
// AI Integration Types
// ============================================================================

export interface AIStrategyRequest {
  type: 'generate' | 'analyze' | 'optimize' | 'explain';
  context: AIStrategyContext;
  constraints?: AIStrategyConstraints;
}

export interface AIStrategyContext {
  userProfile: {
    riskTolerance: StrategyRiskLevel;
    investmentHorizon: 'short' | 'medium' | 'long';
    experience: 'beginner' | 'intermediate' | 'advanced';
    preferences: string[];
  };
  marketConditions: {
    trend: 'bullish' | 'bearish' | 'sideways';
    volatility: 'low' | 'medium' | 'high';
    liquidity: 'low' | 'medium' | 'high';
  };
  portfolioState: {
    totalValue: number;
    allocations: TokenAllocation[];
    currentPnl: number;
  };
  existingStrategy?: Strategy;
}

export interface AIStrategyConstraints {
  maxComplexity: 'simple' | 'moderate' | 'complex';
  allowedActions: ActionType[];
  forbiddenTokens?: string[];
  maxRiskLevel: StrategyRiskLevel;
}

export interface AIStrategyResponse {
  strategy?: StrategySpec;
  analysis?: StrategyAnalysis;
  suggestions?: StrategySuggestion[];
  explanation?: string;
  confidence: number;
}

export interface StrategyAnalysis {
  strengths: string[];
  weaknesses: string[];
  risks: string[];
  opportunities: string[];
  overallScore: number;
}

export interface StrategySuggestion {
  type: 'add_trigger' | 'modify_condition' | 'add_risk_control' | 'optimize_parameter';
  description: string;
  rationale: string;
  expectedImpact: number;
  implementation?: Partial<StrategySpec>;
}

// ============================================================================
// Event Types
// ============================================================================

export type StrategyEventType =
  | 'strategy_created'
  | 'strategy_updated'
  | 'strategy_activated'
  | 'strategy_paused'
  | 'strategy_stopped'
  | 'strategy_archived'
  | 'execution_started'
  | 'execution_completed'
  | 'execution_failed'
  | 'trigger_fired'
  | 'condition_evaluated'
  | 'action_executed'
  | 'risk_control_triggered'
  | 'backtest_completed'
  | 'optimization_completed'
  | 'performance_updated';

export interface StrategyEvent {
  id: string;
  type: StrategyEventType;
  strategyId: string;
  timestamp: Date;
  data: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export type StrategyEventCallback = (event: StrategyEvent) => void;

// ============================================================================
// Configuration Types
// ============================================================================

export interface StrategyEngineConfig {
  enabled: boolean;
  maxActiveStrategies: number;
  maxExecutionsPerMinute: number;
  defaultSlippage: number;
  defaultGasBuffer: number;
  backtestingEnabled: boolean;
  optimizationEnabled: boolean;
  aiIntegrationEnabled: boolean;
  simulationMode: boolean;
  dataRetentionDays: number;
}

export interface StrategyEngineHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    scheduler: boolean;
    executor: boolean;
    monitor: boolean;
    backtester: boolean;
    optimizer: boolean;
  };
  activeStrategies: number;
  pendingExecutions: number;
  lastCheck: Date;
}
