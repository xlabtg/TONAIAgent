/**
 * TONAIAgent - No-Code Visual Strategy Builder Types
 *
 * Type definitions for the visual workflow builder that allows users
 * to create, modify, and deploy autonomous financial strategies without programming.
 */

// ============================================================================
// Core Block Types
// ============================================================================

/**
 * Categories of blocks available in the visual builder
 */
export type BlockCategory =
  | 'trigger'      // Entry points for strategy execution
  | 'condition'    // Decision and filtering logic
  | 'action'       // Execution actions (trading, transfers, etc.)
  | 'risk'         // Risk control and safety limits
  | 'capital'      // Capital allocation and management
  | 'data'         // Data fetching and transformation
  | 'utility';     // Helper blocks (delays, loops, etc.)

/**
 * Types of triggers that can start a strategy
 */
export type TriggerType =
  | 'price_threshold'      // When price crosses a level
  | 'price_change_percent' // When price changes by X%
  | 'time_schedule'        // Cron-based scheduling
  | 'time_interval'        // Recurring intervals
  | 'market_event'         // DEX events, whale movements
  | 'portfolio_threshold'  // Portfolio value/ratio changes
  | 'gas_price'            // When gas is favorable
  | 'liquidity_change'     // Pool liquidity changes
  | 'yield_change'         // APY/APR changes
  | 'manual'               // User-triggered
  | 'webhook'              // External webhook
  | 'ai_signal';           // AI-generated signal

/**
 * Types of conditions for branching logic
 */
export type ConditionType =
  | 'price_comparison'     // Compare token prices
  | 'balance_check'        // Check wallet balance
  | 'position_check'       // Check existing positions
  | 'time_check'           // Time-based conditions
  | 'market_condition'     // Bull/bear/sideways
  | 'volatility_check'     // Volatility levels
  | 'liquidity_check'      // Pool liquidity
  | 'risk_score_check'     // Strategy risk score
  | 'custom_expression';   // Custom logic expression

/**
 * Comparison operators for conditions
 */
export type ComparisonOperator =
  | 'eq'   // Equal
  | 'neq'  // Not equal
  | 'gt'   // Greater than
  | 'gte'  // Greater than or equal
  | 'lt'   // Less than
  | 'lte'  // Less than or equal
  | 'in'   // In list
  | 'nin'; // Not in list

/**
 * Logical operators for combining conditions
 */
export type LogicalOperator = 'and' | 'or' | 'not';

/**
 * Types of actions the strategy can execute
 */
export type ActionType =
  | 'swap'                 // Token swap
  | 'limit_order'          // Place limit order
  | 'transfer'             // Token transfer
  | 'stake'                // Stake tokens
  | 'unstake'              // Unstake tokens
  | 'provide_liquidity'    // Add liquidity
  | 'remove_liquidity'     // Remove liquidity
  | 'claim_rewards'        // Claim staking/LP rewards
  | 'rebalance'            // Rebalance portfolio
  | 'dca_buy'              // Dollar cost averaging buy
  | 'dca_sell'             // Dollar cost averaging sell
  | 'stop_loss'            // Execute stop loss
  | 'take_profit'          // Execute take profit
  | 'notification'         // Send notification
  | 'webhook_call';        // Call external webhook

/**
 * Risk control types
 */
export type RiskControlType =
  | 'max_position_size'    // Maximum position size
  | 'max_daily_loss'       // Daily loss limit
  | 'max_drawdown'         // Maximum drawdown
  | 'stop_loss'            // Stop loss percentage
  | 'take_profit'          // Take profit percentage
  | 'max_slippage'         // Maximum slippage
  | 'gas_limit'            // Maximum gas price
  | 'cooldown_period'      // Time between executions
  | 'max_trades_per_day'   // Daily trade limit
  | 'whitelist_check';     // Token/protocol whitelist

// ============================================================================
// Block Definitions
// ============================================================================

/**
 * Base block interface for all visual blocks
 */
export interface Block {
  /** Unique identifier for the block */
  id: string;
  /** Block type category */
  category: BlockCategory;
  /** Display name */
  name: string;
  /** Description of what the block does */
  description: string;
  /** Version of the block definition */
  version: string;
  /** Configuration parameters */
  config: Record<string, unknown>;
  /** Visual position in the canvas */
  position: Position;
  /** Input connection points */
  inputs: ConnectionPoint[];
  /** Output connection points */
  outputs: ConnectionPoint[];
  /** Whether the block is enabled */
  enabled: boolean;
  /** Validation errors if any */
  validationErrors?: ValidationError[];
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Position on the visual canvas
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Connection point for linking blocks
 */
export interface ConnectionPoint {
  id: string;
  type: 'input' | 'output';
  dataType: DataType;
  label: string;
  required: boolean;
  multiple?: boolean; // Allow multiple connections
}

/**
 * Data types that can flow between blocks
 */
export type DataType =
  | 'trigger'     // Trigger event
  | 'boolean'     // True/false
  | 'number'      // Numeric value
  | 'string'      // Text
  | 'token'       // Token reference
  | 'amount'      // Token amount
  | 'address'     // TON address
  | 'transaction' // Transaction reference
  | 'any';        // Any type

/**
 * Connection between two blocks
 */
export interface Connection {
  id: string;
  sourceBlockId: string;
  sourceOutputId: string;
  targetBlockId: string;
  targetInputId: string;
  label?: string;
}

// ============================================================================
// Specific Block Types
// ============================================================================

/**
 * Trigger block configuration
 */
export interface TriggerBlock extends Omit<Block, 'config'> {
  category: 'trigger';
  triggerType: TriggerType;
  config: TriggerConfig;
}

export interface TriggerConfig {
  type: TriggerType;
  token?: string;
  threshold?: number;
  direction?: 'above' | 'below' | 'cross';
  schedule?: string; // Cron expression
  interval?: number; // Interval in seconds
  eventType?: string;
  enabled: boolean;
}

/**
 * Condition block configuration
 */
export interface ConditionBlock extends Omit<Block, 'config'> {
  category: 'condition';
  conditionType: ConditionType;
  config: ConditionConfig;
}

export interface ConditionConfig {
  type: ConditionType;
  leftOperand: Operand;
  operator: ComparisonOperator;
  rightOperand: Operand;
  logicalOperator?: LogicalOperator;
  nestedConditions?: ConditionConfig[];
}

export interface Operand {
  type: 'constant' | 'variable' | 'expression' | 'block_output';
  value: unknown;
  blockId?: string;
  outputId?: string;
}

/**
 * Action block configuration
 */
export interface ActionBlock extends Omit<Block, 'config'> {
  category: 'action';
  actionType: ActionType;
  config: ActionConfig;
}

export interface ActionConfig {
  type: ActionType;
  fromToken?: string;
  toToken?: string;
  amount?: AmountSpec;
  destination?: string;
  protocol?: string;
  slippage?: number;
  deadline?: number; // Seconds
  params?: Record<string, unknown>;
}

export interface AmountSpec {
  type: 'fixed' | 'percentage' | 'all' | 'variable';
  value: number | string;
  min?: number;
  max?: number;
}

/**
 * Risk control block configuration
 */
export interface RiskBlock extends Omit<Block, 'config'> {
  category: 'risk';
  riskType: RiskControlType;
  config: RiskConfig;
}

export interface RiskConfig {
  type: RiskControlType;
  value: number;
  action: 'warn' | 'pause' | 'stop' | 'revert';
  message?: string;
  notifyUser?: boolean;
}

/**
 * Capital allocation block configuration
 */
export interface CapitalBlock extends Omit<Block, 'config'> {
  category: 'capital';
  config: CapitalConfig;
}

export interface CapitalConfig {
  allocationType: 'fixed' | 'percentage' | 'dynamic';
  allocations: AllocationRule[];
  rebalanceThreshold?: number;
}

export interface AllocationRule {
  token: string;
  target: number; // Percentage or fixed amount
  min?: number;
  max?: number;
  priority?: number;
}

// ============================================================================
// Strategy Definition
// ============================================================================

/**
 * Complete strategy definition
 */
export interface Strategy {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description: string;
  /** Strategy category */
  category: StrategyCategory;
  /** Version number */
  version: string;
  /** Author information */
  author: StrategyAuthor;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Current lifecycle status */
  status: StrategyStatus;
  /** All blocks in the strategy */
  blocks: Block[];
  /** Connections between blocks */
  connections: Connection[];
  /** Global strategy configuration */
  config: StrategyConfig;
  /** Risk parameters */
  riskParams: StrategyRiskParams;
  /** Performance metrics */
  metrics?: StrategyMetrics;
  /** Backtest results */
  backtestResults?: BacktestResult[];
  /** Tags for categorization */
  tags: string[];
  /** Whether the strategy is public */
  isPublic: boolean;
  /** Fork information if forked */
  forkedFrom?: string;
  /** Version history */
  versionHistory: StrategyVersion[];
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

export type StrategyCategory =
  | 'trading'
  | 'yield_farming'
  | 'liquidity_management'
  | 'arbitrage'
  | 'portfolio_automation'
  | 'dao_governance'
  | 'custom';

export type StrategyStatus =
  | 'draft'      // Being edited
  | 'testing'    // In simulation/backtest
  | 'pending'    // Awaiting deployment
  | 'active'     // Running
  | 'paused'     // Temporarily paused
  | 'stopped'    // Manually stopped
  | 'error'      // Error state
  | 'archived';  // Archived

export interface StrategyAuthor {
  id: string;
  name?: string;
  address?: string;
}

export interface StrategyConfig {
  /** Maximum gas budget per execution */
  maxGasPerExecution: number;
  /** Timeout for execution (ms) */
  executionTimeout: number;
  /** Retry policy */
  retryPolicy: RetryPolicy;
  /** Notification settings */
  notifications: NotificationSettings;
  /** Allowed tokens */
  tokenWhitelist: string[];
  /** Allowed protocols */
  protocolWhitelist: string[];
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
}

export interface NotificationSettings {
  onExecution: boolean;
  onError: boolean;
  onProfitTarget: boolean;
  onLossLimit: boolean;
  channels: NotificationChannel[];
}

export type NotificationChannel = 'telegram' | 'email' | 'webhook';

export interface StrategyRiskParams {
  maxPositionSize: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  maxSlippage: number;
  maxTradesPerDay: number;
  cooldownSeconds: number;
}

export interface StrategyVersion {
  version: string;
  createdAt: Date;
  changes: string;
  blocks: Block[];
  connections: Connection[];
  hash: string;
}

// ============================================================================
// Templates
// ============================================================================

/**
 * Pre-built strategy template
 */
export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: StrategyCategory;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedApy?: number;
  riskLevel: 'low' | 'medium' | 'high';
  blocks: Block[];
  connections: Connection[];
  config: Partial<StrategyConfig>;
  riskParams: Partial<StrategyRiskParams>;
  requiredInputs: TemplateInput[];
  tags: string[];
  popularity: number;
  createdBy: string;
}

export interface TemplateInput {
  id: string;
  name: string;
  description: string;
  type: 'token' | 'amount' | 'percentage' | 'address' | 'number' | 'string';
  required: boolean;
  default?: unknown;
  validation?: InputValidation;
}

export interface InputValidation {
  min?: number;
  max?: number;
  pattern?: string;
  options?: unknown[];
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validation error
 */
export interface ValidationError {
  blockId?: string;
  connectionId?: string;
  field?: string;
  code: ValidationErrorCode;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export type ValidationErrorCode =
  | 'missing_required_input'
  | 'invalid_connection'
  | 'type_mismatch'
  | 'circular_dependency'
  | 'unreachable_block'
  | 'missing_trigger'
  | 'invalid_config'
  | 'risk_exceeded'
  | 'unsupported_token'
  | 'unsupported_protocol'
  | 'invalid_expression';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  riskScore: number;
  estimatedGas: number;
  securityChecks: SecurityCheck[];
}

export interface SecurityCheck {
  name: string;
  passed: boolean;
  message?: string;
}

// ============================================================================
// Simulation & Backtesting
// ============================================================================

/**
 * Simulation configuration
 */
export interface SimulationConfig {
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  priceDataSource: 'historical' | 'synthetic';
  slippageModel: 'fixed' | 'variable' | 'realistic';
  gasModel: 'fixed' | 'historical';
  marketConditions?: MarketConditions;
  monteCarloRuns?: number;
}

export interface MarketConditions {
  volatility: 'low' | 'medium' | 'high';
  trend: 'bull' | 'bear' | 'sideways';
  liquidity: 'low' | 'medium' | 'high';
}

/**
 * Backtest result
 */
export interface BacktestResult {
  id: string;
  strategyId: string;
  config: SimulationConfig;
  startedAt: Date;
  completedAt: Date;
  status: 'running' | 'completed' | 'failed';
  metrics: StrategyMetrics;
  trades: SimulatedTrade[];
  equityCurve: EquityPoint[];
  drawdownCurve: DrawdownPoint[];
  monthlyReturns: MonthlyReturn[];
}

export interface StrategyMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  avgTradeReturn: number;
  avgHoldingPeriod: number; // Hours
  volatility: number;
}

export interface SimulatedTrade {
  id: string;
  timestamp: Date;
  type: ActionType;
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  price: number;
  slippage: number;
  gas: number;
  pnl: number;
  cumPnl: number;
}

export interface EquityPoint {
  timestamp: Date;
  value: number;
}

export interface DrawdownPoint {
  timestamp: Date;
  drawdown: number;
}

export interface MonthlyReturn {
  year: number;
  month: number;
  return: number;
}

// ============================================================================
// AI Assistant
// ============================================================================

/**
 * AI strategy suggestion request
 */
export interface AIStrategyRequest {
  prompt: string;
  context?: AIContext;
  constraints?: AIConstraints;
}

export interface AIContext {
  riskTolerance: 'low' | 'medium' | 'high';
  investmentHorizon: 'short' | 'medium' | 'long';
  preferredTokens?: string[];
  preferredProtocols?: string[];
  existingStrategies?: string[];
}

export interface AIConstraints {
  maxComplexity: 'simple' | 'moderate' | 'complex';
  requireBacktest: boolean;
  maxRiskScore: number;
}

/**
 * AI strategy suggestion response
 */
export interface AIStrategyResponse {
  strategy: Strategy;
  explanation: string;
  riskAnalysis: string;
  alternatives: AIAlternative[];
  confidence: number;
}

export interface AIAlternative {
  name: string;
  description: string;
  tradeoffs: string;
}

/**
 * AI optimization suggestion
 */
export interface AIOptimizationSuggestion {
  type: 'parameter' | 'structure' | 'risk';
  target: string;
  currentValue: unknown;
  suggestedValue: unknown;
  reason: string;
  expectedImprovement: number;
}

// ============================================================================
// Collaboration
// ============================================================================

/**
 * Strategy sharing settings
 */
export interface SharingSettings {
  isPublic: boolean;
  allowFork: boolean;
  allowCopy: boolean;
  sharedWith: SharedUser[];
  accessLevel: AccessLevel;
}

export interface SharedUser {
  userId: string;
  accessLevel: AccessLevel;
  sharedAt: Date;
}

export type AccessLevel = 'view' | 'edit' | 'admin';

/**
 * Team workspace
 */
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  owner: string;
  members: WorkspaceMember[];
  strategies: string[];
  createdAt: Date;
}

export interface WorkspaceMember {
  userId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: Date;
}

// ============================================================================
// Observability
// ============================================================================

/**
 * Real-time strategy metrics
 */
export interface LiveMetrics {
  strategyId: string;
  timestamp: Date;
  pnl: number;
  pnlPercent: number;
  totalValue: number;
  positions: PositionInfo[];
  recentTrades: TradeInfo[];
  activeRisks: RiskAlert[];
  agentStatus: AgentStatus;
}

export interface PositionInfo {
  token: string;
  amount: number;
  value: number;
  allocation: number;
  pnl: number;
  entryPrice: number;
  currentPrice: number;
}

export interface TradeInfo {
  id: string;
  timestamp: Date;
  type: ActionType;
  tokens: string;
  amount: number;
  pnl: number;
  status: 'pending' | 'completed' | 'failed';
}

export interface RiskAlert {
  type: RiskControlType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  triggeredAt: Date;
  resolved: boolean;
}

export type AgentStatus =
  | 'idle'
  | 'monitoring'
  | 'executing'
  | 'paused'
  | 'error';

// ============================================================================
// Events
// ============================================================================

/**
 * Strategy events for real-time updates
 */
export type StrategyEvent =
  | StrategyCreatedEvent
  | StrategyUpdatedEvent
  | StrategyStatusChangedEvent
  | StrategyExecutionEvent
  | StrategyErrorEvent;

export interface StrategyCreatedEvent {
  type: 'strategy_created';
  strategyId: string;
  timestamp: Date;
}

export interface StrategyUpdatedEvent {
  type: 'strategy_updated';
  strategyId: string;
  changes: string[];
  timestamp: Date;
}

export interface StrategyStatusChangedEvent {
  type: 'status_changed';
  strategyId: string;
  previousStatus: StrategyStatus;
  newStatus: StrategyStatus;
  reason?: string;
  timestamp: Date;
}

export interface StrategyExecutionEvent {
  type: 'execution';
  strategyId: string;
  blockId: string;
  actionType: ActionType;
  result: 'success' | 'failure';
  details: Record<string, unknown>;
  timestamp: Date;
}

export interface StrategyErrorEvent {
  type: 'error';
  strategyId: string;
  blockId?: string;
  error: string;
  severity: 'warning' | 'error' | 'critical';
  timestamp: Date;
}

export type StrategyEventCallback = (event: StrategyEvent) => void;
