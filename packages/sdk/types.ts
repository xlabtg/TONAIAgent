/**
 * TONAIAgent - Enterprise SDK Types
 *
 * Core type definitions for the developer SDK and platform.
 */

// ============================================================================
// SDK Configuration
// ============================================================================

export interface SDKConfig {
  /** API key for authentication */
  apiKey?: string;

  /** Base URL for API endpoints */
  baseUrl?: string;

  /** Environment (production, sandbox, development) */
  environment?: SDKEnvironment;

  /** Default timeout for operations (ms) */
  timeoutMs?: number;

  /** Enable debug logging */
  debug?: boolean;

  /** Custom logger */
  logger?: SDKLogger;

  /** Event callback */
  onEvent?: SDKEventCallback;

  /** Retry configuration */
  retry?: RetryConfig;

  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;
}

export type SDKEnvironment = 'production' | 'sandbox' | 'development';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerSecond: number;
}

// ============================================================================
// SDK Logger
// ============================================================================

export interface SDKLogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

// ============================================================================
// SDK Events
// ============================================================================

export interface SDKEvent {
  id: string;
  timestamp: Date;
  type: SDKEventType;
  source: string;
  data: Record<string, unknown>;
  severity: 'debug' | 'info' | 'warn' | 'error';
}

export type SDKEventType =
  | 'sdk:initialized'
  | 'sdk:error'
  | 'agent:created'
  | 'agent:started'
  | 'agent:stopped'
  | 'agent:error'
  | 'strategy:deployed'
  | 'strategy:executed'
  | 'strategy:error'
  | 'api:request'
  | 'api:response'
  | 'api:error'
  | 'webhook:received'
  | 'webhook:sent'
  | 'extension:installed'
  | 'extension:activated'
  | 'extension:deactivated'
  | 'extension:uninstalled'
  | 'extension:error'
  | 'sandbox:created'
  | 'sandbox:destroyed';

export type SDKEventCallback = (event: SDKEvent) => void;

// ============================================================================
// Agent Types
// ============================================================================

export interface AgentConfig {
  /** Unique agent identifier */
  id?: string;

  /** Human-readable name */
  name: string;

  /** Agent description */
  description?: string;

  /** Agent type */
  type: AgentType;

  /** Owner user ID */
  userId: string;

  /** AI provider configuration */
  aiConfig?: AgentAIConfig;

  /** Strategy configuration */
  strategyConfig?: AgentStrategyConfig;

  /** Risk management configuration */
  riskConfig?: AgentRiskConfig;

  /** Execution configuration */
  executionConfig?: AgentExecutionConfig;

  /** Monitoring configuration */
  monitoringConfig?: AgentMonitoringConfig;

  /** Custom metadata */
  metadata?: Record<string, unknown>;

  /** Tags for organization */
  tags?: string[];
}

export type AgentType =
  | 'trading'
  | 'portfolio'
  | 'arbitrage'
  | 'yield'
  | 'data'
  | 'risk'
  | 'custom';

export interface AgentAIConfig {
  /** AI provider (groq, anthropic, openai, etc.) */
  provider?: string;

  /** Model to use */
  model?: string;

  /** System prompt */
  systemPrompt?: string;

  /** Temperature for responses */
  temperature?: number;

  /** Maximum tokens */
  maxTokens?: number;
}

export interface AgentStrategyConfig {
  /** Strategy ID to execute */
  strategyId?: string;

  /** Strategy parameters */
  parameters?: Record<string, unknown>;

  /** Execution interval (ms) */
  intervalMs?: number;

  /** Trigger conditions */
  triggers?: StrategyTrigger[];
}

export interface StrategyTrigger {
  type: 'price' | 'time' | 'event' | 'condition';
  condition: string;
  value: unknown;
}

export interface AgentRiskConfig {
  /** Maximum position size (in TON) */
  maxPositionSize?: number;

  /** Maximum daily loss (in TON) */
  maxDailyLoss?: number;

  /** Stop loss percentage */
  stopLossPercent?: number;

  /** Take profit percentage */
  takeProfitPercent?: number;

  /** Enable circuit breaker */
  circuitBreakerEnabled?: boolean;

  /** Circuit breaker threshold */
  circuitBreakerThreshold?: number;
}

export interface AgentExecutionConfig {
  /** Maximum concurrent operations */
  maxConcurrentOps?: number;

  /** Operation timeout (ms) */
  timeoutMs?: number;

  /** Retry configuration */
  retry?: RetryConfig;

  /** Require confirmation for high-value operations */
  requireConfirmation?: boolean;

  /** Confirmation threshold (in TON) */
  confirmationThreshold?: number;
}

export interface AgentMonitoringConfig {
  /** Enable metrics collection */
  metricsEnabled?: boolean;

  /** Metrics collection interval (ms) */
  metricsIntervalMs?: number;

  /** Enable alerting */
  alertsEnabled?: boolean;

  /** Alert channels */
  alertChannels?: AlertChannel[];

  /** Log level */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface AlertChannel {
  type: 'webhook' | 'email' | 'telegram' | 'slack';
  config: Record<string, unknown>;
}

// ============================================================================
// Agent State
// ============================================================================

export interface AgentState {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  createdAt: Date;
  startedAt?: Date;
  stoppedAt?: Date;
  lastActiveAt?: Date;
  metrics: AgentMetrics;
  health: AgentHealth;
}

export type AgentStatus =
  | 'initializing'
  | 'running'
  | 'paused'
  | 'stopped'
  | 'error';

export interface AgentMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  totalProfitLoss: number;
  avgExecutionTimeMs: number;
  uptime: number;
}

export interface AgentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  issues: HealthIssue[];
}

export interface HealthIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  detectedAt: Date;
}

// ============================================================================
// Strategy Types
// ============================================================================

export interface StrategyDefinition {
  /** Unique strategy identifier */
  id?: string;

  /** Strategy name */
  name: string;

  /** Strategy description */
  description?: string;

  /** Strategy version */
  version: string;

  /** Strategy author */
  author: StrategyAuthor;

  /** Strategy type */
  type: StrategyType;

  /** Strategy category */
  category: StrategyCategory;

  /** Strategy parameters schema */
  parameters: StrategyParameterSchema[];

  /** Entry conditions */
  entryConditions?: StrategyCondition[];

  /** Exit conditions */
  exitConditions?: StrategyCondition[];

  /** Risk rules */
  riskRules?: RiskRule[];

  /** Code (for custom strategies) */
  code?: string;

  /** Tags */
  tags?: string[];

  /** Public visibility */
  isPublic?: boolean;

  /** Minimum required capital */
  minCapital?: number;

  /** Estimated risk level */
  riskLevel?: 'low' | 'medium' | 'high' | 'very-high';
}

export interface StrategyAuthor {
  id: string;
  name: string;
  verified?: boolean;
}

export type StrategyType =
  | 'dca'
  | 'grid'
  | 'momentum'
  | 'arbitrage'
  | 'yield'
  | 'rebalance'
  | 'custom';

export type StrategyCategory =
  | 'trading'
  | 'yield-farming'
  | 'arbitrage'
  | 'portfolio'
  | 'automation';

export interface StrategyParameterSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
  min?: number;
  max?: number;
  enum?: unknown[];
}

export interface StrategyCondition {
  id: string;
  type: 'price' | 'indicator' | 'time' | 'volume' | 'custom';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between' | 'crosses';
  value: unknown;
  timeframe?: string;
}

export interface RiskRule {
  id: string;
  type: 'stop-loss' | 'take-profit' | 'position-limit' | 'exposure-limit' | 'custom';
  parameters: Record<string, unknown>;
}

// ============================================================================
// Execution Types
// ============================================================================

export interface ExecutionRequest {
  /** Request ID */
  id?: string;

  /** Agent ID */
  agentId: string;

  /** Strategy ID (optional) */
  strategyId?: string;

  /** Operation type */
  operation: OperationType;

  /** Operation parameters */
  parameters: Record<string, unknown>;

  /** Priority */
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  /** Timeout (ms) */
  timeoutMs?: number;

  /** Require confirmation */
  requireConfirmation?: boolean;

  /** Idempotency key */
  idempotencyKey?: string;
}

export type OperationType =
  | 'trade'
  | 'swap'
  | 'stake'
  | 'unstake'
  | 'transfer'
  | 'rebalance'
  | 'custom';

export interface ExecutionResult {
  id: string;
  requestId: string;
  agentId: string;
  status: ExecutionStatus;
  operation: OperationType;
  startedAt: Date;
  completedAt?: Date;
  result?: unknown;
  error?: ExecutionError;
  txHash?: string;
  gasUsed?: number;
  metrics: ExecutionMetrics;
}

export type ExecutionStatus =
  | 'pending'
  | 'executing'
  | 'confirming'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ExecutionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
}

export interface ExecutionMetrics {
  queueTimeMs: number;
  executionTimeMs: number;
  confirmationTimeMs?: number;
  totalTimeMs: number;
}

// ============================================================================
// API Types
// ============================================================================

export interface APIRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata: APIMetadata;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
}

export interface APIMetadata {
  requestId: string;
  timestamp: Date;
  latencyMs: number;
  rateLimit?: RateLimitInfo;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface WebhookConfig {
  /** Webhook URL */
  url: string;

  /** Events to subscribe to */
  events: SDKEventType[];

  /** Secret for signature verification */
  secret?: string;

  /** Active status */
  active?: boolean;

  /** Custom headers */
  headers?: Record<string, string>;

  /** Retry configuration */
  retry?: RetryConfig;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: SDKEvent;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttemptAt?: Date;
  nextAttemptAt?: Date;
  response?: WebhookResponse;
}

export interface WebhookResponse {
  statusCode: number;
  headers: Record<string, string>;
  body?: string;
  latencyMs: number;
}

// ============================================================================
// Extension Types
// ============================================================================

export interface ExtensionManifest {
  /** Extension ID */
  id: string;

  /** Extension name */
  name: string;

  /** Extension version */
  version: string;

  /** Extension description */
  description: string;

  /** Extension author */
  author: ExtensionAuthor;

  /** Extension type */
  type: ExtensionType;

  /** Extension category */
  category: string;

  /** Required permissions */
  permissions: ExtensionPermission[];

  /** Extension capabilities */
  capabilities: ExtensionCapabilities;

  /** Configuration schema */
  configSchema?: Record<string, unknown>;

  /** Entry point */
  entryPoint?: string;

  /** Keywords for search */
  keywords?: string[];

  /** License */
  license?: string;
}

export interface ExtensionAuthor {
  name: string;
  email?: string;
  url?: string;
}

export type ExtensionType =
  | 'data-source'
  | 'signal-provider'
  | 'strategy'
  | 'integration'
  | 'analytics'
  | 'notification'
  | 'custom';

export interface ExtensionPermission {
  scope: string;
  reason: string;
  required: boolean;
}

export interface ExtensionCapabilities {
  /** Data sources provided */
  dataSources?: DataSourceCapability[];

  /** Signals provided */
  signals?: SignalCapability[];

  /** Integrations provided */
  integrations?: IntegrationCapability[];

  /** Custom functions */
  functions?: FunctionCapability[];
}

export interface DataSourceCapability {
  name: string;
  description: string;
  dataType: string;
  refreshInterval?: number;
}

export interface SignalCapability {
  name: string;
  description: string;
  signalType: string;
  timeframes?: string[];
}

export interface IntegrationCapability {
  name: string;
  description: string;
  protocol: string;
}

export interface FunctionCapability {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  returns: Record<string, unknown>;
}

export interface ExtensionInstance {
  manifest: ExtensionManifest;
  status: 'installed' | 'active' | 'inactive' | 'error';
  config: Record<string, unknown>;
  installedAt: Date;
  activatedAt?: Date;
  metrics: ExtensionMetrics;
}

export interface ExtensionMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgLatencyMs: number;
  lastCalledAt?: Date;
}

// ============================================================================
// Sandbox Types
// ============================================================================

export interface SandboxConfig {
  /** Sandbox name */
  name?: string;

  /** Initial balance (in simulated TON) */
  initialBalance?: number;

  /** Simulation speed multiplier */
  speedMultiplier?: number;

  /** Market data source */
  marketDataSource?: 'historical' | 'live' | 'synthetic';

  /** Start timestamp for historical data */
  startTimestamp?: Date;

  /** End timestamp for historical data */
  endTimestamp?: Date;

  /** Enable transaction simulation */
  enableTransactions?: boolean;

  /** Enable slippage simulation */
  enableSlippage?: boolean;

  /** Custom slippage percentage */
  slippagePercent?: number;

  /** Enable gas simulation */
  enableGas?: boolean;

  /** Timeout (ms) */
  timeoutMs?: number;
}

export interface SandboxState {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'completed' | 'error';
  createdAt: Date;
  currentTimestamp: Date;
  balance: SandboxBalance;
  positions: SandboxPosition[];
  transactions: SandboxTransaction[];
  performance: SandboxPerformance;
}

export interface SandboxBalance {
  ton: number;
  jettons: Record<string, number>;
  totalValueTon: number;
}

export interface SandboxPosition {
  asset: string;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  openedAt: Date;
}

export interface SandboxTransaction {
  id: string;
  type: OperationType;
  asset: string;
  amount: number;
  price: number;
  fee: number;
  timestamp: Date;
  status: 'success' | 'failed';
}

export interface SandboxPerformance {
  totalPnl: number;
  totalPnlPercent: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  maxDrawdown: number;
  sharpeRatio: number;
  avgTradeReturn: number;
}

// ============================================================================
// Marketplace Types
// ============================================================================

export interface MarketplaceItem {
  id: string;
  type: 'strategy' | 'extension' | 'signal' | 'template';
  name: string;
  description: string;
  author: MarketplaceAuthor;
  version: string;
  category: string;
  tags: string[];
  price: MarketplacePrice;
  stats: MarketplaceStats;
  rating: MarketplaceRating;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketplaceAuthor {
  id: string;
  name: string;
  verified: boolean;
  avatar?: string;
}

export interface MarketplacePrice {
  type: 'free' | 'one-time' | 'subscription';
  amount?: number;
  currency?: string;
  period?: 'monthly' | 'yearly';
}

export interface MarketplaceStats {
  downloads: number;
  activeUsers: number;
  totalRevenue: number;
}

export interface MarketplaceRating {
  average: number;
  count: number;
  distribution: number[];
}

// ============================================================================
// Utility Types
// ============================================================================

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  type?: string;
  category?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}
